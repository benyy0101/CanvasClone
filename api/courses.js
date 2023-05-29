const { Router } = require('express')
const { validateAgainstSchema } = require('../lib/validation')
const router = Router()

const { generateAuthToken, 
    requireAuthentication 
} = require('../lib/auth')

const {
    UserSchema,
    getUserByEmail,
    getUserById
    
} = require('../models/user')

const{
    CourseSchema, 
    insertNewCourse,
    getCourses,
    getCourseById,
    updateCourseById,
    deleteCourseById
} = require('../models/course')
const { getAssignments } = require('../models/assignment')

router.get('/', async(req,res,next) => {

    // ensure page number is valid
    if (parseInt(req.query.page) < 1) {
        res.status(500).send({
            error: "Error. Invalid page number."
        })
    }

    const courses = await getCourses(req.query.page, req.query.subject, req.query.number, req.query.term)
    try{
        res.status(200).send({ courses })
    } catch(err){
        res.status(500).send({ err })
    }
})

router.post('/', requireAuthentication, async(req,res,next)=>{
    //console.log(req.user)
    const auth = await getUserByEmail(req.user)
    
    //console.log("11111111111",data)
    console.log(req.body)
    if(auth.role == 'admin' || (auth.role == 'instructor' && auth._id == req.body.instructorId)){
        if(validateAgainstSchema(req.body, CourseSchema)){
            try{
                //console.log("11111")
                const id = await insertNewCourse(req.body)
                //console.log(id)
                res.status(201).send({
                    id:id
                })
            }
            catch{
                res.status(500).send({
                    error: "Error inserting course into DB.  Please try again later."
                })
            }
        }
        else{
            res.status(400).send({
                error: "The request body was either not present or did not contain a valid Course object."
            })
        }
    }
    else{
        res.status(403).send({
            error: "The request was not made by an authenticated User satisfying the authorization criteria described above."
        }) 
    }
})


router.get('/:courseId', async (req,res,next)=>{
    const course = await getCourseById(req.params.courseId)
    console.log(course)
    if(course != null){
        try{
            res.status(201).send(course)
        } catch{
            res.status(500).send({
                error: "Error.  Please try again later."
            })
        }
    }
    else{
        res.status(404).send({
            error: "Specified Course id not found."
        })
    }
})

router.put('/:courseId',requireAuthentication, async (req,res,next)=>{
    //console.log(req.user)
    const auth = await getUserByEmail(req.user)
    const result = await updateCourseById(req.params.courseId, req.body)
    if(auth.role == 'admin'|| (auth.role == 'instructor' && auth._id == req.params.instructorId)){
        if(validateAgainstSchema(req.body, CourseSchema)){
            if(result){
                res.status(200).send({})
            }
            else{
                res.status(404).send({
                    error: "Specified Course id not found"
                })
            }
        }
        else{
            res.status(400).send({
                error: "The request body was either not present or did not contain any fields related to Course objects."
            })
        }
    }
    else{
        res.status(403).send({
            error: "The request was not made by an authenticated User satisfying the authorization criteria described above."
        })
    }
})

router.delete('/:courseId',requireAuthentication, async (req,res,next)=>{
    //console.log(req.user)
    const auth = await getUserByEmail(req.user)
    const result = await deleteCourseById(req.params.courseId)
    console.log(auth)
    if(auth.role == 'admin'){
        if(result){
            res.status(204).send({})
        }
        else{
            res.status(404).send({
                error: "Specified Course id not found"
            })
        }
    }
    else{
        res.status(403).send({
            error: "The request was not made by an authenticated User satisfying the authorization criteria described above."
        })
    }
})

router.get('/:courseId/students',requireAuthentication, async(req,res,next)=>{
    const auth = await getUserByEmail(req.user)
    const course = await getCourseById(req.params.courseId)
    
    const studentList = []
    if(auth.role == 'admin' || (auth.role == 'instructor' && auth._id == course.instructorId)){
        
        if(course.studentId){
            for (let i = 0; i<course.studentId.length;i++){
            const temp = await getUserById(course.studentId[i])
            //console.log(temp)
            studentList.push(temp)
        }}

        if(course){
            res.status(200).send({
                student:studentList
            })
        }
        else{
            res.status(404).send({
                error:"	Specified Course id not found."
            })
        }
    }
    else{
        res.status(403).send({
            error:"The request was not made by an authenticated User satisfying the authorization criteria described above."
        })
    }
    
})

router.post('/:courseId/students', requireAuthentication,async(req,res,next)=>{
    //console.log("hi")
    const auth = await getUserByEmail(req.user)
    const course = await getCourseById(req.params.courseId)

    const add = req.body.add
    const remove = req.body.remove
    let studentList = []
    for (let i = 0; i<course.studentId.length;i++){
        //console.log(temp)
        studentList.push(course.studentId[i])
    }
    for(let i = 0; i<add.length; i++){
        studentList.push(add[i])
    }
    studentList = studentList.filter(id => !remove.includes(id))

    if(auth.role == 'admin' || (auth.role == 'instructor' && auth._id == course.instructorId)){
        if(course){
            const resBody = {
                _id: course._id,
                subject:course.subject,
                number: course.number,
                title: course.title,
                term: course.term,
                instructorId: course.instructorId,
                studentId: studentList
            }
    
            if(validateAgainstSchema(resBody, CourseSchema)){
                const result = updateCourseById(course._id, resBody)
                res.status(200).send({
                    resBody
                })
            }
            else{
                res.status(400).send({
                    error: "The request body was either not present or did not contain the fields described above."
                })
            }
        }
        else{
            res.status(404).send({
                error:"	Specified Course id not found."
            })
        }
    }
    else{
        res.status(403).send({
            error:"The request was not made by an authenticated User satisfying the authorization criteria described above."
        })
    }

})

router.get('/:courseId/assignments', async(req,res,next)=>{
    console.log("Hi")
    const auth = getUserByEmail(req.user)
    console.log(req.params.courseId)
    const assignments = await getAssignments(req.params.courseId)
    //console.log(assignments)
    res.status(200).send({
        assignments: assignments
    })
})
module.exports = router;