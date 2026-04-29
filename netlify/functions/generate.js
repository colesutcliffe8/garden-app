exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const IDEOGRAM_KEY = process.env.IDEOGRAM_KEY;
  if (!IDEOGRAM_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'IDEOGRAM_KEY not configured' }) };
  }

  try {
    const { imageBase64, maskBase64, imageMime, prompt } = JSON.parse(event.body);

    if (!imageBase64 || !maskBase64 || !prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const maskBuffer  = Buffer.from(maskBase64,  'base64');
    const ext = imageMime === 'image/png' ? 'png' : 'jpg';
    const boundary = 'IdeoBoundary' + Date.now();
    const CRLF = '\r\n';

    const part = (name, filename, mime, buf) => Buffer.concat([
      Buffer.from('--' + boundary + CRLF +
        'Content-Disposition: form-data; name="' + name + '"; filename="' + filename + '"' + CRLF +
        'Content-Type: ' + mime + CRLF + CRLF),
      buf,
      Buffer.from(CRLF)
    ]);

    const textPart = (name, value) =>
      Buffer.from('--' + boundary + CRLF +
        'Content-Disposition: form-data; name="' + name + '"' + CRLF + CRLF +
        value + CRLF);

    const body = Buffer.concat([
      part('image_file', 'garden.' + ext, imageMime, imageBuffer),
      part('mask',       'mask.png',       'image/png', maskBuffer),
      textPart('prompt', prompt),
      textPart('model',  'V_2'),
      textPart('magic_prompt_option', 'OFF'),
      textPart('num_images', '4'),
      Buffer.from('--' + boundary + '--' + CRLF)
    ]);

    const response = await fetch('https://api.ideogram.ai/edit', {
      method: 'POST',
      headers: {
        'Api-Key': IDEOGRAM_KEY,
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
      },
      body,
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
