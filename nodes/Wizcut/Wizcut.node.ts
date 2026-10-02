import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

export class Wizcut implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WizCut',
		name: 'wizcut',
		icon: { light: 'file:wizcut-light.svg', dark: 'file:wizcut-dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'AI-powered multicam podcast editing',
		defaults: { name: 'WizCut' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'wizcutApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Job',
						value: 'job',
					},
				],
				default: 'job',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['job'] } },
				options: [
					{
						name: 'Approve',
						value: 'approve',
						description: 'Approve the rendered video for download',
						action: 'Approve a rendered job',
					},
					{
						name: 'Create Job',
						value: 'createJob',
						description: 'Create a new editing job and get upload URLs for source files',
						action: 'Create a new editing job',
					},
					{
						name: 'Get Job',
						value: 'getJob',
						description:
							'Get the current status and details of a job, including WizCut’s proposed speaker mapping (camera_map)',
						action: 'Get job status',
					},
					{
						name: 'Set Speaker Mapping',
						value: 'setSpeakerMapping',
						description: 'Tell WizCut which speakers are on which camera, then generate cuts',
						action: 'Set the speaker mapping of a job',
					},
					{
						name: 'Start Processing',
						value: 'startProcessing',
						description: 'Start audio sync and speaker detection',
						action: 'Start processing a job',
					},
					{
						name: 'Start Render',
						value: 'startRender',
						description: 'Start rendering the final video once cuts are ready',
						action: 'Start rendering a job',
					},
				],
				default: 'createJob',
			},

			// --- Create Job fields ---
			{
				displayName: 'Sources (JSON)',
				name: 'sources',
				type: 'json',
				default: '[{"label": "Camera 1"}, {"label": "Camera 2"}]',
				required: true,
				displayOptions: { show: { resource: ['job'], operation: ['createJob'] } },
				description:
					'Array of source objects. Each needs a "label". Optional: "kind" (video/audio), "ext" (mp4/mov/wav/...), "fileSize" (bytes, for multipart upload).',
			},
			{
				displayName: 'Callback URL',
				name: 'callbackUrl',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['job'], operation: ['createJob'] } },
				description:
					'Webhook URL to receive status updates (mapping, ready, approved). Use the URL from a WizCut Trigger node.',
			},
			{
				displayName: 'Review Before Render',
				name: 'review',
				type: 'boolean',
				default: true,
				displayOptions: { show: { resource: ['job'], operation: ['createJob'] } },
				description:
					'Whether to pause for human review before rendering. When true, the job pauses at "ready" status so cuts can be reviewed in the WizCut editor.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['job'], operation: ['createJob'] } },
				options: [
					{
						displayName: 'Auto Map',
						name: 'autoMap',
						type: 'options',
						default: 'confident',
						options: [
							{
								name: 'Off',
								value: 'off',
								description: 'Always confirm speakers yourself in WizCut',
							},
							{
								name: 'Confident',
								value: 'confident',
								description:
									'Assign speakers automatically when WizCut is sure; otherwise wait for you',
							},
							{
								name: 'Always',
								value: 'always',
								description: 'Never wait: use the best guess',
							},
						],
						description:
							'Whether WizCut assigns speakers to cameras on its own. When it doesn’t, the job waits in "mapping" status for someone to confirm.',
					},
					{
						displayName: 'Pause Removal',
						name: 'pauseRemoval',
						type: 'options',
						default: 'off',
						options: [
							{
								name: 'Off',
								value: 'off',
								description: 'Keep all pauses as recorded',
							},
							{
								name: 'Tighten',
								value: 'tighten',
								description: 'Shorten long pauses to a natural beat (recommended)',
							},
							{
								name: 'Remove',
								value: 'remove',
								description: 'Cut long pauses out almost entirely',
							},
						],
						description:
							'Automatically shorten or remove long pauses before cuts are generated',
					},
				],
			},

			// --- Job ID (shared by get/process/render/approve) ---
			{
				displayName: 'Job ID',
				name: 'jobId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['approve', 'getJob', 'setSpeakerMapping', 'startProcessing', 'startRender'],
					},
				},
				description: 'The job ID returned from Create Job',
			},

			// --- Start Processing fields ---
			{
				displayName: 'Speaker Detection Sources',
				name: 'diarizeSourceIds',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['job'], operation: ['startProcessing'] } },
				description:
					'Comma-separated source IDs to use for speaker detection. Defaults to the first source.',
			},

			// --- Set Speaker Mapping fields ---
			{
				displayName: 'Tracks (JSON)',
				name: 'tracks',
				type: 'json',
				default: '[{"sourceId": "", "speakers": ["SPEAKER_00"]}]',
				required: true,
				displayOptions: { show: { resource: ['job'], operation: ['setSpeakerMapping'] } },
				description:
					'Array of {sourceId, speakers: string[]}: which speakers each video source shows. A camera can show more than one speaker. Get Job’s camera_map holds WizCut’s proposal. Works while the job is in "mapping" status.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('wizcutApi');
		const baseUrl = ((credentials.baseUrl as string) || 'https://wizcut.com').replace(/\/$/, '');

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				if (operation === 'createJob') {
					const sourcesJson = this.getNodeParameter('sources', i) as string;
					const sources =
						typeof sourcesJson === 'string' ? JSON.parse(sourcesJson) : sourcesJson;
					const callbackUrl = this.getNodeParameter('callbackUrl', i, '') as string;
					const review = this.getNodeParameter('review', i, true) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as {
						autoMap?: string;
						pauseRemoval?: string;
					};

					const body: Record<string, unknown> = { sources, review };
					if (callbackUrl) body.callbackUrl = callbackUrl;
					if (additionalFields.autoMap) body.autoMap = additionalFields.autoMap;
					if (additionalFields.pauseRemoval && additionalFields.pauseRemoval !== 'off') {
						body.silence = { mode: additionalFields.pauseRemoval };
					}

					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'wizcutApi',
						{
							method: 'POST',
							url: `${baseUrl}/api/jobs`,
							body,
							json: true,
						},
					);
					returnData.push({ json: response as INodeExecutionData['json'], pairedItem: { item: i } });
				}

				if (operation === 'getJob') {
					const jobId = this.getNodeParameter('jobId', i) as string;
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'wizcutApi',
						{
							method: 'GET',
							url: `${baseUrl}/api/jobs/${jobId}`,
							json: true,
						},
					);
					returnData.push({ json: response as INodeExecutionData['json'], pairedItem: { item: i } });
				}

				if (operation === 'startProcessing') {
					const jobId = this.getNodeParameter('jobId', i) as string;
					const diarizeStr = this.getNodeParameter('diarizeSourceIds', i, '') as string;
					const body: Record<string, unknown> = {};
					if (diarizeStr) {
						body.diarizeSourceIds = diarizeStr.split(',').map((s) => s.trim());
					}
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'wizcutApi',
						{
							method: 'POST',
							url: `${baseUrl}/api/jobs/${jobId}/process`,
							body,
							json: true,
						},
					);
					returnData.push({ json: response as INodeExecutionData['json'], pairedItem: { item: i } });
				}

				if (operation === 'setSpeakerMapping') {
					const jobId = this.getNodeParameter('jobId', i) as string;
					const tracksJson = this.getNodeParameter('tracks', i) as string;
					const tracks = typeof tracksJson === 'string' ? JSON.parse(tracksJson) : tracksJson;
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'wizcutApi',
						{
							method: 'POST',
							url: `${baseUrl}/api/jobs/${jobId}/tracks`,
							body: { tracks },
							json: true,
						},
					);
					returnData.push({ json: response as INodeExecutionData['json'], pairedItem: { item: i } });
				}

				if (operation === 'startRender') {
					const jobId = this.getNodeParameter('jobId', i) as string;
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'wizcutApi',
						{
							method: 'POST',
							url: `${baseUrl}/api/jobs/${jobId}/render`,
							json: true,
						},
					);
					returnData.push({ json: response as INodeExecutionData['json'], pairedItem: { item: i } });
				}

				if (operation === 'approve') {
					const jobId = this.getNodeParameter('jobId', i) as string;
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'wizcutApi',
						{
							method: 'POST',
							url: `${baseUrl}/api/jobs/${jobId}/approve`,
							json: true,
						},
					);
					returnData.push({ json: response as INodeExecutionData['json'], pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: this.getInputData(i)[0].json,
						error,
						pairedItem: { item: i },
					});
				} else {
					throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
				}
			}
		}

		return [returnData];
	}
}
