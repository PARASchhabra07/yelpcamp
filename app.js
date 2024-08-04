const express = require('express');
const app =express();
const path= require('path');
const ejsmate =require('ejs-mate');
const expErr = require('./utils/expErr');
const wrapAsync = require('./utils/wrapasync');
const session = require('express-session');
const passport=require('passport');
const flash = require('connect-flash');
const localStrategy = require('passport-local');

const  methodOverride = require('method-override');

const Campground = require('./model/campground');
const Review = require('./model/review');
const User = require('./model/user');
// const Isloggedin = require('./middleware');

const mongoose = require('mongoose');
const campground = require('./model/campground');
const { readFile } = require('fs');
const { wrap } = require('module');
mongoose.connect('mongodb://127.0.0.1:27017/yelp-camp')
.then(()=>{
    console.log('db connected');
})
.catch((err)=>{
    console.log(err);
})

const sesssionconfig = {
    secret:'thisshouldbeabettersecret',
    resave:false,
    saveUninitialized:true,
    cookie:{
        maxAge:1000*60*60*24*7,
        expires:Date.now() + 1000*60*60*24*7,
        httpOnly:true,
    }
};

app.use(session(sesssionconfig));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());    // USED TO STORE USER INTO SESSION
passport.deserializeUser(User.deserializeUser());  //TO GET USER OUT OF THAT SESSION


app.engine('ejs',ejsmate);
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));

app.use(express.urlencoded({extended:true}));
app.use(methodOverride('_method'));

app.use(flash());
 
                                     // LOCAL VARIABLES
//WE HAVE ACCESS TO THESE  (currentUser , success , error)  at middlewares or templates.
//res.locals is an object that provides a way to store variables that can be accessed by your templates and other middleware functions during req-res cycle.
app.use((req, res, next) => {
    res.locals.currentUser = req.user;     //req.user has info like { _id:....,email:'....',username:'...'};
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})


//                                  MIDDLEWARE

const isLoggedIn = (req, res, next) => {         
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;  //originalUrl  ,from where it was called
        req.flash('error', 'You must be signed in first!');
        return res.redirect('/login');
    }
    next();
}
//SINCE SESSION GETS CLEARED AFTER A SUCCESSFULL LOGIN ,SO WE NEED TO STORE -> session.returnto
const storeReturnTO = (req,res,next)=>{
    if(req.session.returnTo){
        res.locals.returnTo = req.session.returnTo;
    }
    next();
}

const isAuthor = async(req,res,next)=>{
    const {id} = req.params;
    const camp = await Campground.findById(id);
    if(!camp.author.equals(req.user._id)){
        req.flash('error','You dont have permission to do that!!!!!');
        res.redirect(`/campgrounds/${id}`);
    }
    next();
}
                                  // NOT WORKING 
// const isReviewAuthor = async(req,res,next)=>{
//     const{id, Rid} = req.params;
//     const review = await Review.findById(Rid);
//     if(!review.author.equals(req.user._id)){
//         req.flash('error','You dont have permission to do that!!!!!');
//         res.redirect(`/campgrounds/${id}`);
//     }
//     next();
// }

app.get('/',(req,res)=>{
    res.render('home');
})
 
//                              CAMPGROUND ROUTES

app.get('/campgrounds', async (req,res)=>{
    const camp = await Campground.find({});
    res.render('campgrounds/index',{campgrounds:camp});
})

app.get('/campgrounds/new',isLoggedIn ,(req,res)=>{
       res.render('campgrounds/new');
})


app.get('/campgrounds/:id',wrapAsync(async (req,res)=>{
        const {id} = req.params;
        const camp = await Campground.findById(id).populate({
            path:'reviews',
            populate:{
                path:'author',    //THIS FOR THE AUTHOR OF A REVIEW
            }
        }).populate('author');    //THIS FOR AUTHOR OF A CAMPGROUND
        // console.log(camp);
        res.render('campgrounds/show',{campground:camp});
        // next(err);    
}))


app.post('/campgrounds', wrapAsync(async (req,res)=>{
    //    res.send(req.body);
        // if(!req.body) throw new expErr('Invalid Camp data',400);
        const newcamp = new Campground(req.body);
        newcamp.author= req.user._id;
        await newcamp.save();
        req.flash('success','new camp created!!!!');
        res.redirect(`/campgrounds/${newcamp._id}`);
}))

app.get('/campgrounds/:id/edit', isLoggedIn, isAuthor ,wrapAsync(async (req,res)=>{
    const {id} = req.params;
    const camp = await Campground.findById(id);
    //used middleware
    // ALREDAY WE HAVE HIDE THE EDIT,DELETE FOR OTHERS BUT , IF WE DO LIKE WRITE ON A LINK /edit SO EDIT PAGE OPENS UP AND ALLOWING EDIT , SO TO PREVENT IT.
    // if(!camp.author.equals(req.user._id)){
    //     req.flash('error','You dont have permission to do that!!!!!');
    //     res.redirect(`/campgrounds/${id}`);
    // }
    res.render('campgrounds/edit',{camp});
}))

app.put('/campgrounds/:id',isLoggedIn, isAuthor ,wrapAsync(async (req,res)=>{
       const {id} =req.params;
    //    const camp =await Campground.findById(id);
       // ALREDAY WE HAVE HIDE THE EDIT,DELETE FOR OTHERS BUT , IF WE DO LIKE WRITE ON A LINK /edit SO EDIT PAGE OPENS UP AND ALLOWING EDIT , SO TO PREVENT IT.
    //    if(!camp.author.equals(req.user._id)){
    //            req.flash('error','You dont have permission to do that!!!!!');
    //            res.redirect(`/campgrounds/${id}`);
    //    }
       const updcamp = await Campground.findByIdAndUpdate(id,req.body,{runValidators:true});
       req.flash('success','successfully updated camp');
       res.redirect(`/campgrounds/${updcamp._id}`);
}))

app.delete('/campgrounds/:id',isLoggedIn,wrapAsync( async (req,res)=>{
      const {id} = req.params;
      const delcamp = await Campground.findByIdAndDelete(id);
      res.redirect('/campgrounds');
}))
 

//                                     REVIEW  ROUTES

// /campgrounds/:id/reviews      IT WAS NOT WORKING , COZ DURING returnTo , we getting errror coz its POST method . ERROR->  Cannot GET /campgrounds/669d139a0ecfb8dd300d1dae/reviews
// /campgrounds/:id/reviews      AND returnTo this link does not holds anything wtf reviews.
// /campgrounds/:id/AB YAHA TOH KUCH BHI LIKH LO JUST PATH HAI.
//  AND WE DID THIS SINCE NO OTHER POST ROUTE TO /campgrounds/:id.
app.post('/campgrounds/:id',isLoggedIn ,wrapAsync(async (req,res)=>{
        const camp = await Campground.findById(req.params.id);
        const review = new Review(req.body);
        review.author = req.user._id;
        camp.reviews.push(review);
        await review.save();
        await camp.save();
        req.flash('success','Review created!!!!');
        res.redirect(`/campgrounds/${camp._id}`);
}))

app.delete('/campgrounds/:id/reviews/:Rid',isLoggedIn ,wrapAsync(async(req,res)=>{
          const {id,Rid} = req.params;
          await Review.findByIdAndDelete(Rid);     // IT DELETES REVIEW ONLY
          await Campground.findByIdAndUpdate(id,{$pull:{reviews : Rid}}) //IT DELETE REVIEW FROM CAMP DATABASE 
          req.flash('success','review deleted succ!!!!')
          res.redirect(`/campgrounds/${id}`);
}))

//                                         REGISTER ROUTE 
app.get('/register',(req,res)=>{
     res.render('user/register');
})
 
app.post('/register', wrapAsync(async(req,res)=>{
    try{
        const {username,email,password} =req.body;
        const user = new User({username,email});
        const FinalUser = await User.register(user,password);

        req.login(FinalUser ,(err)=>{    //TO MAKE REGISTERED PERSON LOGIN, as soon as person registers
            if(err){return next(err)};
            
            req.flash('success','WEL TO YELPCAMP');
            res.redirect('/campgrounds');
        })

    }catch(e){
       req.flash('error',e.message);
       res.redirect('/register');
    }
})) 

//                                 LOGIN ROUTES
app.get('/login',(req,res)=>{
     res.render('user/login');
})

//passport.authenticate() logs the user in (if correct password) and clears the req.session.
app.post('/login', storeReturnTO , passport.authenticate('local',{failureFlash:true,failureRedirect:'/login'}) ,(req,res)=>{
       req.flash('success','Successfuly logged in');
// WE ARE USING req.locals TO REDIRECT THE USER AFTER LOGIN.
       const redirectURL = res.locals.returnTo || '/campgrounds';
    //    console.log(res.locals.returnTo);  WHEN returnTo is /campgrounds/669d139a0ecfb8dd300d1dae/reviews, we getting errror coz its POST method . ERROR->  Cannot GET /campgrounds/669d139a0ecfb8dd300d1dae/reviews
      res.redirect(redirectURL);
    })

//                                 LOGOUT ROUTE
app.get('/logout', (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        req.flash('success', 'Goodbye!');
        res.redirect('/');
    });
}); 

app.use((err,req,res,next)=>{
    const {message='something went wrrong',statuscode=500}= err;
    res.status(statuscode).send(message);
})

app.listen(3000,()=>{
    console.log('Serving on port 3000');
})
