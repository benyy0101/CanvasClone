const req = require('express/lib/request')
const { ObjectId, GridFSBucket } = require('mongodb')
const fs = require('fs')

const { getDbReference } = require('../lib/mongo')
const { extractValidFields } = require('../lib/validation')

//Schema for Submission

const SubmissionSchema = {
    assignmentId: { required: true },
    studentId: { required: true },
    timestamp: { required: true },
    grade: { required: false },
    file: { required: true }
}
exports.SubmissionSchema = SubmissionSchema

exports.insertNewSubmission = async function (submission) {
    const db = getDbReference();
    const collection = db.collection('submissions');
  
    const metadata = {
      contentType: submission.contentType,
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      timestamp: submission.timestamp,
      grade: submission.grade,
      file: submission.file
    };
  
    const result = await collection.insertOne(metadata);
    return result.insertedId;
}

exports.getSubmissionByCourseId = async function (id,page=1) {
    const db = getDbReference()
    const collection = db.collection('submissions')

    const pageSize = 100;

    if (ObjectId.isValid(id)) {
        
        const results = await collection.find({ assignmentId: id }).skip((page-1)*pageSize).limit(pageSize).toArray()
        
        return results
    } else {
        return null
    }
}

exports.updateSubmissionById = async function (id, submission) {
    const db = getDbReference()
    const collection = db.collection('submissions')

    if (ObjectId.isValid(id)) {
        const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: submission })
        return result.matchedCount > 0 
    } else {
        return null
    }
}

exports.deleteSubmissionById = async function (id) {
    const db = getDbReference()
    const collection = db.collection('submissions')

    if (ObjectId.isValid(id)) {
        const result = await collection.deleteOne({ _id: new ObjectId(id) })
        return result.deletedCount > 0
    } else {
        return null
    }
}

exports.saveFile = async function(file){
    return new Promise((resolve, reject) => {
        const db = getDbReference()
        const bucket = new GridFSBucket(db, {
          bucketName: 'submissions'
        })
        const metadata = {
          contentType: file.contentType,
          assignmentId: file.assignmentId,
          studentId: file.studentId,
          timestamp: file.timestamp,
        }
    
        const uploadStream = bucket.openUploadStream(
          file.filename,
          { metadata: metadata }
        )
        fs.createReadStream(file.path).pipe(uploadStream)
          .on('error', (err) => {
            reject(err)
          })
          .on('finish', (result) => {
            resolve(result._id)
          })
      })
}

