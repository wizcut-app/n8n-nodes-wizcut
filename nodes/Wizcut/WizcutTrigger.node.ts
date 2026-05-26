import type {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class WizcutTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WizCut Trigger',
		name: 'wizcutTrigger',
		icon: 'file:wizcut.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts a workflow when a WizCut job changes status',
		defaults: { name: 'WizCut Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'wizcutApi', required: false }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'wizcut',
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Any Status Change',
						value: 'any',
						description: 'Trigger on any job status change',
					},
					{
						name: 'Approved',
						value: 'approved',
						description: 'Rendered video approved for download',
					},
					{
						name: 'Cuts Ready',
						value: 'ready',
						description:
							'Speaker mapping confirmed and cuts generated — ready for review or render',
					},
					{
						name: 'Mapping Ready',
						value: 'mapping',
						description:
							'Diarization complete — speakers detected, waiting for mapping in WizCut UI',
					},
					{
						name: 'Render Complete',
						value: 'complete',
						description: 'Video rendering finished',
					},
				],
				default: 'any',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData() as {
			jobId?: string;
			status?: string;
			speakers?: string[];
			reviewUrl?: string;
			outputUrl?: string;
			error?: string;
		};

		const event = this.getNodeParameter('event', 'any') as string;

		if (event !== 'any' && body.status !== event) {
			return {};
		}

		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}
