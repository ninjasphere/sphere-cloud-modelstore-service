module.exports = {
  unknown_error: { code:500, message:'An unknown internal error occurred.'},
  not_supported: { code:400, message:'This endpoint is not supported.'},
  tags: {
  	no_such_object: {code:404, message:'The specified tag does not exist.'},
  	bad_content_type: {code:415, message:'Unsupported Media Type'}
  }
};
