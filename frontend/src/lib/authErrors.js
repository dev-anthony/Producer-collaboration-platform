export function friendlyAuthError(error) {
  return error instanceof TypeError
    ? 'Could not reach ProdCollab. Check your connection and that the app has finished starting up.'
    : error.message;
}
