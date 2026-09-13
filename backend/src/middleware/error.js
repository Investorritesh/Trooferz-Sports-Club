export const notFound = (req, res) => {
  res.status(404).json({
    message: 'API route not found.',
    path: req.originalUrl,
    method: req.method
  });
};

export const errorHandler = (err, req, res, next) => {
  console.error('[API_ERROR]', {
    method: req.method,
    path: req.originalUrl,
    message: err?.message,
    code: err?.code,
    name: err?.name,
    stack: err?.stack
  });

  if (err?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      message: 'A record with the same unique value already exists.'
    });
  }

  if (err?.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      message: 'The selected related record does not exist.'
    });
  }

  if (err?.code === 'ER_DATA_TOO_LONG') {
    return res.status(400).json({
      message: 'One of the submitted values is too long.'
    });
  }

  if (err?.code === 'ER_BAD_NULL_ERROR') {
    return res.status(400).json({
      message: 'A required value is missing.'
    });
  }

  const isDev = process.env.NODE_ENV !== 'production';
  return res.status(500).json({
    message: 'Unexpected server error.',
    ...(isDev && err?.message ? { details: err.message } : {})
  });
};
