var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  
  initialize: function() {
    // bcrypt.genSalt(10, function(err, salt) {
    this.on('creating', function(model, attrs, options){
      model.set('salt', bcrypt.genSaltSync(10));
      model.set('password', bcrypt.hashSync(model.get('password'), model.get('salt')));
    });
    // });
  }

});


module.exports = User;