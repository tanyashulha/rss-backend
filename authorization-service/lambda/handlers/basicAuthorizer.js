const generatePolicy = (principalId, effect, resource) => ({
  principalId,
  policyDocument: {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
      },
    ],
  },
});

const getAuthorizationHeader = (event) => {
  if (event.authorizationToken) {
    return event.authorizationToken;
  }

  const headers = event.headers || {};
  return headers.Authorization || headers.authorization;
};

const parseBasicCredentials = (authorizationHeader) => {
  const base64Credentials = authorizationHeader.replace(/^Basic\s+/i, '').trim();
  const decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const separatorIndex = decoded.indexOf(':');

  if (separatorIndex === -1) {
    return null;
  }

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
};

exports.handler = async (event) => {
  console.log('EVENT:', JSON.stringify(event));

  const authorizationHeader = getAuthorizationHeader(event);

  if (!authorizationHeader) {
    throw new Error('Unauthorized');
  }

  const credentials = parseBasicCredentials(authorizationHeader);

  if (!credentials) {
    return generatePolicy('user', 'Deny', event.methodArn);
  }

  const expectedPassword = process.env[credentials.username];

  if (!expectedPassword || expectedPassword !== credentials.password) {
    return generatePolicy('user', 'Deny', event.methodArn);
  }

  return generatePolicy(credentials.username, 'Allow', event.methodArn);
};
