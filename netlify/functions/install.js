// netlify/functions/install.js
// Returns the APK and IPA URLs stored in Netlify environment variables.

exports.handler = async (event, context) => {
  const apkUrl = process.env.EXPO_APK_URL || '';
  const ipaUrl = process.env.EXPO_IPA_URL || '';
  const body = JSON.stringify({ apkUrl, ipaUrl });
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
    body,
  };
};
