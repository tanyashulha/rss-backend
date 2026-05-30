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

const isMissingToken = (authorizationHeader) => {
  if (!authorizationHeader || !String(authorizationHeader).trim()) {
    return true;
  }

  const match = String(authorizationHeader).match(/^Basic\s+(.+)$/i);

  if (!match) {
    return true;
  }

  const token = match[1].trim();

  return !token || token === 'null' || token === 'undefined';
};

const parseBasicCredentials = (authorizationHeader) => {
  const match = String(authorizationHeader).match(/^Basic\s+(.+)$/i);

  if (!match) {
    return null;
  }

  const base64Credentials = match[1].trim();

  if (!base64Credentials || base64Credentials === 'null' || base64Credentials === 'undefined') {
    return null;
  }

  let decoded;

  try {
    decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  } catch {
    return null;
  }

  const separatorIndex = decoded.indexOf(':');

  if (separatorIndex === -1) {
    return null;
  }

  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  if (!username || password === undefined || password === '') {
    return null;
  }

  return { username, password };
};

exports.handler = async (event) => {
  console.log('EVENT:', JSON.stringify(event));

  const authorizationHeader = getAuthorizationHeader(event);

  if (isMissingToken(authorizationHeader)) {
    throw new Error('Unauthorized');
  }

  const credentials = parseBasicCredentials(authorizationHeader);

  if (!credentials) {
    throw new Error('Unauthorized');
  }

  const expectedPassword = process.env[credentials.username];

  if (!expectedPassword || expectedPassword !== credentials.password) {
    return generatePolicy('user', 'Deny', event.methodArn);
  }

  return generatePolicy(credentials.username, 'Allow', event.methodArn);
};
