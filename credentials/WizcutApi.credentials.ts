import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WizcutApi implements ICredentialType {
	name = 'wizcutApi';
	displayName = 'WizCut API';
	documentationUrl = 'https://wizcut.com/docs/api';
	icon = 'file:../nodes/Wizcut/wizcut.svg' as const;

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your WizCut API key (starts with wc_live_). Find it at wizcut.com/settings.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://wizcut.com',
			description: 'WizCut API base URL. Only change this for self-hosted instances.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/jobs',
			method: 'GET',
		},
	};
}
