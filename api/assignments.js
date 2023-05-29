const { Router } = require('express')
const multer = require('multer')
const router = Router()
const { getDbReference } = require('../lib/mongo')
const { ObjectId } = require('mongodb')
const crypto = require('crypto')
module.exports = router

const {
    requireAuthentication 
} = require('../lib/auth')

const {
    UserSchema,
    getUserByEmail

} = require('../models/user')

const fileTypes = {
    'application/pdf': 'pdf'
  };

const { validateAgainstSchema } = require('../lib/validation')
const { insertNewAssignment, AssignmentSchema, getAssignmentById, updateAssignmentById } = require('../models/assignment')
const { getCourseById } = require('../models/course')
const { send } = require('express/lib/response')
const { getSubmissionByCourseId, 
    SubmissionSchema, 
    insertNewSubmission, 
    saveFile } = require('../models/submission')

const upload = multer({
    storage: multer.diskStorage({
      destination: `uploads`,
      filename: (req, file, callback) => {
        const filename = crypto.pseudoRandomBytes(16).toString('hex')
        const extension = fileTypes[file.mimetype]
        callback(null, `${filename}.${extension}`)
      }
    }),
    fileFilter: (req, file, callback) => {
      callback(null, !!fileTypes[file.mimetype])
    }
  });

router.post('',requireAuthentication, async(req,res,next)=>{
    const auth = await getUserByEmail(req.user)
    //console.log("courseId:",parseInt(req.body.courseId))
    const course = await getCourseById(req.body.courseId)
    //console.log("course:",course)
    //console.log("BOdy:",req.body)
    //console.log(validateAgainstSchema(req.body,AssignmentSchema))
    //console.log(auth.role)
    //console.log(auth._id)
    //console.log(course.instructorId)
    if(course == null){
        res.status(403).send({
            error: "CourseId is not valid."
        }).next()
    }
    if(auth.role == 'admin' || (auth.role == 'instructor' && auth._id == course.instructorId)){
        if(validateAgainstSchema(req.body,AssignmentSchema)){
            const id = await insertNewAssignment(req.body)
            res.status(201).send({
                id:id
            })
        }
        else{
            res.status(400).send({
                err: "The request body was either not present or did not contain any fields related to Assignment objects."
            })
        }
    }
    else{
        res.status(403).send({
            error:"The request was not made by an authenticated User satisfying the authorization criteria described above."
        })
    }
})

router.get('/:assignId', async(req,res,next)=>{
    const assignment = await getAssignmentById(req.params.assignId)
    if(assignment != null){
        try{
            res.status(201).send(assignment)
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

router.put('/:assignId',requireAuthentication, async(req,res,next)=>{
    const auth = await getUserByEmail(req.user)
    //console.log(req.body.courseId)
    const course = await getCourseById(req.body.courseId)
    if(auth.role == 'admin' || (auth.role == 'instructor' && auth._id == course.instructorId)){
        if(validateAgainstSchema(req.body,AssignmentSchema)){
            const result = updateAssignmentById(req.params.assignId, req.body)
            if(result){
                res.status(200).send()
            }
            else{
                res.status(404).send({
                    error: "Specified Assignment id not found"
                })
            }
        }
        else{
            res.status(400).send({
                err: "The request body was either not present or did not contain any fields related to Assignment objects."
            })
        }
    }
    else{
        res.status(403).send({
            error:"The request was not made by an authenticated User satisfying the authorization criteria described above."
        })
    }
})

router.delete('/:assignId',requireAuthentication, async (req,res,next)=>{
    const auth = await getUserByEmail(req.user)
    const assignment = await getAssignmentById(req.params.assignId)
    //console.log(assignment)
    const course = await getCourseById(assignment.courseId)
    if(auth.role == 'admin' || (auth.role == 'instructor' && auth._id == course.instructorId)){
        const db = getDbReference()
        const collection = db.collection('assignments')
        if (ObjectId.isValid(req.params.assignId)) {
            const result = await collection.deleteOne({ _id: new ObjectId(req.params.assignId) })
            if(result){
                res.status(200).send({
                    
                })
            }
            else{
                res.status(404).send({
                    error: "Specified Assignment id not found"
                })
            }
        } 
    }
    else{
        res.status(403).send({
            error:"The request was not made by an authenticated User satisfying the authorization criteria described above."
        })
    }
})

router.get('/:assignId/submission',requireAuthentication, async(req,res,next)=>{
    const auth = await getUserByEmail(req.user)
    const assignment = await getAssignmentById(req.params.assignId)
    const course = await getCourseById(assignment.courseId)
    if(auth.role == 'admin' || (auth.role == 'instructor' && auth._id == course.instructorId)){
        //console.log(assignment.courseId)
        const results = await getSubmissionByCourseId(req.params.assignId, req.query.page)
        console.log(results)
        if(results){
            
            res.status(200).send({
                submissions: results
            })
        }
        else{
            res.status(404).send({
                error: "Specified Assignment id not found"
            })
        }
    }
    else{
        res.status(403).send({
            error:"The request was not made by an authenticated User satisfying the authorization criteria described above."
        })
    }
})

router.post('/:assignId/submission',requireAuthentication, upload.single('file'), async(req,res,next)=>{
    const auth = await getUserByEmail(req.user)
    const assignment = await getAssignmentById(req.params.assignId)
    //console.log("==req.body: ",req.body)
    //console.log(validateAgainstSchema(req.body, SubmissionSchema))
    console.log(req.file.filename)
    const submission = {
        assignmentId: req.params.assignId,
        studentId: req.body.studentId,
        timestamp: req.body.timestamp,
        grade: req.body.grade,
        file: `/uploads/${req.file.filename}`,
        path: req.file.path
    }

    //console.log("== submission: ", submission)
    //console.log(validateAgainstSchema(req.body, SubmissionSchema))
    if(auth.role == 'admin' || (auth.role == 'instructor' && auth._id == course.instructorId)){
        if(req.file && validateAgainstSchema(submission,SubmissionSchema)){
        
            const id = await saveFile(submission)
            const result = await insertNewSubmission(submission)
            res.status(200).send({
                id: result
            })
        }
        else if(!ObjectId.isValid(id)){
            res.status(404).send({
                error: "Specified Assignment id not found."
            })
        }
        else{
            res.status(400).send({
                error: "The request body was either not present or did not contain a valid Submission object."
            })
        }
    }
    else{
        res.status(404).send({
            error: "The request was not made by an authenticated User satisfying the authorization criteria described above."
        })
    }
    
})