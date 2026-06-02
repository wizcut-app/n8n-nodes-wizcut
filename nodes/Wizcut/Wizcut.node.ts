import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class Wizcut implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WizCut',
		name: 'wizcut',
		icon: 'file:wizcut.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'AI-powered multicam podcast editing',
		defaults: { name: 'WizCut' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'wizcutApi', required: true }],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
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
						description: 'Get the current status and details of a job',
						action: 'Get job status',
					},
					{
						name: 'Start Processing',
						value: 'startProcessing',
						description: 'Start audio sync and speaker diarization',
						action: 'Start processing a job',
					},
					{
						name: 'Start Render',
						value: 'startRender',
						description: 'Start rendering the final video after speaker mapping is confirmed',
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
				displayOptions: { show: { operation: ['createJob'] } },
				description:
					'Array of source objects. Each needs a "label". Optional: "kind" (video/audio), "ext" (mp4/mov/wav/...), "fileSize" (bytes, for multipart upload).',
			},
			{
				displayName: 'Callback URL',
				name: 'callbackUrl',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['createJob'] } },
				description:
					'Webhook URL to receive status updates (mapping, ready, approved). Use the URL from a WizCut Trigger node.',
			},
			{
				displayName: 'Review Before Render',
				name: 'review',
				type: 'boolean',
				default: true,
				displayOptions: { show: { operation: ['createJob'] } },
				description:
					'Whether to pause for human review before rendering. When true, the job pauses at "ready" status so cuts can be reviewed in the WizCut editor.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { operation: ['createJob'] } },
				options: [
					{
						displayName: 'Generate Proxy',
						name: 'generateProxy',
						type: 'boolean',
						default: false,
						description: 'Whether to generate 720p proxy files for faster preview',
					},
					{
						displayName: 'Tracks (JSON)',
						name: 'tracks',
						type: 'json',
						default: '',
						description:
							'Pre-assign speakers to sources. Array of {sourceId, speakers: string[]}. Usually set later via the WizCut UI.',
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
					show: { operation: ['approve', 'getJob', 'startProcessing', 'startRender'] },
				},
				description: 'The job ID returned from Create Job',
			},

			// --- Start Processing fields ---
			{
				displayName: 'Diarize Source IDs',
				name: 'diarizeSourceIds',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['startProcessing'] } },
				description:
					'Comma-separated source IDs to use for speaker diarization. Defaults to the first source.',
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
						tracks?: string;
						generateProxy?: boolean;
					};

					const body: Record<string, unknown> = { sources, review };
					if (callbackUrl) body.callbackUrl = callbackUrl;
					if (additionalFields.tracks) {
						body.tracks =
							typeof additionalFields.tracks === 'string'
								? JSON.parse(additionalFields.tracks)
								: additionalFields.tracks;
					}
					if (additionalFields.generateProxy) body.generateProxy = true;

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
					throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
				}
			}
		}

		return [returnData];
	}
}
