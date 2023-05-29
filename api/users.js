const { Router } = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const router = Router()

const { generateAuthToken, 
    requireAuthentication 
} = require('../lib/auth')

const {
    UserSchema,
    getUserByEmail,
    insertNewUser,
    getUserById
} = require('../models/user')


const { validateAgainstSchema } = require('../lib/validation')
const { getCourseById, getCourseByInstructorId, getCourseByStudentId } = require('../models/course')

//Create a new user

router.post('/', requireAuthentication, async (req,res,next) =>{
    const data = await getUserByEmail(req.user)
    //console.log(req.body)
    //console.log(validateAgainstSchema(req.body, UserSchema))
    if(data.role != 'admin'){
        res.status(403).send({
            error: "Unauthorized to create users."
        })
    }
    else{
        if(validateAgainstSchema(req.body, UserSchema)){
            try{
                const id = await insertNewUser(req.body)
                console.log("id------------",id)
                res.status(201).send({
                    id:id
                })
            } catch(err){
                console.log(err)
             res.status(400).send({
                 error: "Error inserting user information into DB.  Please try again later."
               })
            }
        }
    }
})

//Login

router.post('/login', async (req,res,next)=>{

    if(req.body && req.body.email && req.body.password){
        const userEmail = req.body.email
        console.log(userEmail)
        const user = await getUserByEmail(userEmail)
        //console.log(user)
        const authenticated = user && await bcrypt.compare(
            req.body.password,
            user.password
        )
        //console.log(authenticated)
        if(authenticated){
            const token = generateAuthToken(req.body.email)
        
            res.status(200).send({ token: token })
        }
        
        else {
            res.status(401).send({
                error: "Invalid credentials"
            })
        }
    }
    else {
        res.status(400).send({
            error: "Request needs user ID and password."
        })
    }
})


router.get('/:userid',requireAuthentication, async function(req,res,next){
    //console.log("11111111",req.user)
    //console.log(req.user)
    const auth = await getUserByEmail(req.user)
    const user = await getUserById(req.params.userid) 
    //console.log(user)
    //console.log(user.email, user.role)
    if(user != null){
        if(auth.role == 'instructor' && user.email == auth.email){
            console.log(user._id)
            const result = await getCourseByInstructorId(req.params.userid)
            console.log(result)
            res.status(200).send({
                user: user,
                courses: result
            })
        }
        else if(auth.role == 'student'&& user.email == auth.email){
            //console.log("student")
            const result = await getCourseByStudentId(req.params.userid)
            res.status(200).send({
                user: user,
                courses: result
            })
        }
        else if(auth.role == 'admin'){
            //console.log("admin")
            res.status(200).send(user)
        }
        else{
            res.status(403).send({
                err:"Unauthorized to access the specified resource"
            })
        }
    }
    else{
        res.status(404).send({
            error: "Specified Course id not found."
        })
    }
})
module.exports = router