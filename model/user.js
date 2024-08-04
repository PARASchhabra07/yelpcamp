const mongoose= require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userschema = new mongoose.Schema({
             email:{
                type:String,
                require:true
             }
});

userschema.plugin(passportLocalMongoose); //IT WOULD ADD USERNAME AND PASSWORD FIELDS ITSELF.
module.exports = mongoose.model('User',userschema);