const mongoose = require('mongoose');

const reviewschema = new mongoose.Schema({
    body:String,
    rating:Number,
    author:{
        type:String,
        ref:'User',
    }
});

module.exports = mongoose.model('Review',reviewschema);