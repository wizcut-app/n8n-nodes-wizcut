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
	icon = {
		light: 'file:../nodes/Wizcut/wizcut-light.svg',
		dark: 'file:../nodes/Wizcut/wizcut-dark.svg',
	} as const;

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
				// Lets WizCut tell n8n workflows apart from other API clients.
				'X-WizCut-Client': 'n8n',
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
