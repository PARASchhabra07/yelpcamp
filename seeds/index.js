const mongoose = require('mongoose');
const Campground = require('../model/campground');
const cities= require('./cities');
const {descriptors,places} = require('./seedhelper');

mongoose.connect('mongodb://127.0.0.1:27017/yelp-camp')
.then(()=>{
    console.log('db connected');
})
.catch((err)=>{
    console.log(err);
})

const sample = (arr) => arr[Math.floor(Math.random()*arr.length)];

const seebDB = async () => {
      await Campground.deleteMany({});
      for(let i=0;i<50;i++){
        const randno = Math.floor(Math.random()*1000);
        const randpr = Math.floor(Math.random()*30)+10;
        const camp =  new Campground({
            location:`${cities[randno].city} , ${cities[randno].state}`,
            author:'669c0c8e3a5bce96d8264d80',
            title:`${sample(descriptors)} ${sample(places)}`, 
            image:`https://picsum.photos/400?random=${Math.random()}`,
            description:"Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit",
            price:randpr,
        })
        await camp.save();
      }
}

seebDB().then(()=>{
    mongoose.connection.close();
})


