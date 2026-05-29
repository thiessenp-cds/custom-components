/**
 * AWS AppSync configuration for the live chat demo.
 *
 * Deploy infrastructure/chat-appsync.yaml to your AWS account, then copy the
 * three output values from the CloudFormation stack's Outputs tab into this file.
 *
 * These values are intentionally non-secret: the Cognito Identity Pool only
 * grants unauthenticated guests access to the single AppSync chat API.
 *
 * Example deploy command:
 *   aws cloudformation deploy \
 *     --template-file infrastructure/chat-appsync.yaml \
 *     --stack-name custom-components-chat \
 *     --capabilities CAPABILITY_NAMED_IAM
 */
export const APPSYNC_CONFIG = {
  /** AppSync GraphQL endpoint — CloudFormation output: AppSyncEndpoint */
  endpoint: 'REPLACE_WITH_APPSYNC_ENDPOINT',

  /** AWS region the stack is deployed in, e.g. 'ca-central-1' — output: Region */
  region: 'REPLACE_WITH_REGION',

  /** Cognito Identity Pool ID — CloudFormation output: IdentityPoolId */
  identityPoolId: 'REPLACE_WITH_IDENTITY_POOL_ID',
} as const

/** Returns true when all three config values have been filled in with real values. */
export function isAppSyncConfigured(): boolean {
  return (
    !APPSYNC_CONFIG.endpoint.startsWith('REPLACE') &&
    !APPSYNC_CONFIG.region.startsWith('REPLACE') &&
    !APPSYNC_CONFIG.identityPoolId.startsWith('REPLACE')
  )
}
