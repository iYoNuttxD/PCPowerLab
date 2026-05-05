export function ok(res, data, message = 'Operação realizada com sucesso.') {
  return res.status(200).json({
    success: true,
    data,
    message
  });
}

export function created(res, data, message = 'Registro criado com sucesso.') {
  return res.status(201).json({
    success: true,
    data,
    message
  });
}

export function fail(res, statusCode, message, errors = []) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
    errors
  });
}
