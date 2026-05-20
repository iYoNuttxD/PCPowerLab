export function ok(res, data, message = 'Operação realizada com sucesso.') {
  return res.status(200).json({
    success: true,
    message,
    data
  });
}

export function created(res, data, message = 'Registro criado com sucesso.') {
  return res.status(201).json({
    success: true,
    message,
    data
  });
}

export function fail(res, statusCode, message, errors = []) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
}
