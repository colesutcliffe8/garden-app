exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const IDEOGRAM_KEY = process.env.IDEOGRAM_KEY;
  if (!IDEOGRAM_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'IDEOGRAM_KEY not configured' }) };
  }

  try {
    // Parse the JSON body sent from the frontend
    const { imageBase64, imageMime, prompt } = JSON.parse(event.body);

    if (!imageBase64 || !imageMime || !prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    // Convert base64 image to buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const ext = imageMime === 'image/png' ? 'png' : imageMime === 'image/webp' ? 'webp' : 'jpg';

    // Build multipart form data properly on the server
    const boundary = 'NetlifyBoundary' + Date.now();
    const CRLF = '\r\n';

    const imageRequestObj = {
      prompt: prompt,
      model: 'V_2',
      aspect_ratio: 'ASPECT_4_3',
      magic_prompt_option: 'OFF',
      num_samples: 4
    };

    // Build each part as a Buffer
    const part1 = Buffer.from(
      '--' + boundary + CRLF +
      'Content-Disposition: form-data; name="image_request"' + CRLF + CRLF +
      JSON.stringify(imageRequestObj) + CRLF
    );

    const part2 = Buffer.from(
      '--' + boundary + CRLF +
      'Content-Disposition: form-data; name="image_weight"' + CRLF + CRLF +
      '95' + CRLF
    );

    const part3Header = Buffer.from(
      '--' + boundary + CRLF +
      'Content-Disposition: form-data; name="image_file"; filename="garden.' + ext + '"' + CRLF +
      'Content-Type: ' + imageMime + CRLF + CRLF
    );

    const part3Footer = Buffer.from(CRLF + '--' + boundary + '--' + CRLF);

    // Combine all parts
    const body = Buffer.concat([part1, part2, part3Header, imageBuffer, part3Footer]);

    const response = await fetch('https://api.ideogram.ai/remix', {
      method: 'POST',
      headers: {
        'Api-Key': IDEOGRAM_KEY,
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
      },
      body: body,
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
