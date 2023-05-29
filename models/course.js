const { ObjectId } = require('mongodb')

const { getDbReference } = require('../lib/mongo')
const { extractValidFields } = require('../lib/validation')

//Schema for Course

const CourseSchema = {
    subject: { required:true },
    number: { required:true },
    title: { required:true },
    term: { required:true },
    instructorId: { required:true },
    studentId: {required:false}
}
exports.CourseSchema = CourseSchema

exports.insertNewCourse = async function (course) {
    const db = getDbReference()
    const collection = db.collection('courses')

    let newCourse = extractValidFields(course, CourseSchema)

    const result = await collection.insertOne(newCourse)

    return result.insertedId
}

exports.getCourses = async function (page=1, subject=/.*/, number=/.*/, term=/.*/) {
    const db = getDbReference()
    const collection = db.collection('courses')

    pageSize = 10

    const results = await collection.find({ subject: subject, number: number, term: term }).skip((page-1)*pageSize).limit(pageSize).toArray()
    return results
}

exports.getCourseById = async function (id) {
    const db = getDbReference()
    const collection = db.collection('courses')

    if(ObjectId.isValid(id)){
        const results = await collection.findOne({ _id: new ObjectId(id) })
        return results
    } else {
        return null
    }
}

exports.getCourseByInstructorId = async function (id){
    const db = getDbReference()
    const collection = db.collection('courses')
    console.log("==id:", id)
    if(ObjectId.isValid(id)){
        const results = await collection.find({ 'instructorId': id}).toArray()
        return results
    } else {
        return null
    }
}

exports.getCourseByStudentId = async function (id){
    const db = getDbReference()
    const collection = db.collection('courses')
    const returns = []
    if(ObjectId.isValid(id)){
        const results = await collection.find().toArray()
        if(results){
            for(let i =0; i < results.length; i++){
                
                if(results[i].studentId && results[i].studentId.includes(id)){
                    console.log(results[i].studentId)
                    returns.push(results[i])
                }
            }
            return returns
        }
        else{
            return null
        }
    } else {
        return null
    }
}


exports.updateCourseById = async function (id, course) {
    const db = getDbReference()
    const collection = db.collection('courses')

    if (ObjectId.isValid(id)) {
        const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: course })
        return result.matchedCount > 0 
    } else {
        return null
    }
}

exports.deleteCourseById = async function (id) {
    const db = getDbReference()
    const collection = db.collection('courses')

    if (ObjectId.isValid(id)) {
        const result = await collection.deleteOne({ _id: new ObjectId(id) })
        return result.deletedCount > 0 
    } else {
        return null
    }
}

/*
* Creates a DB query to bulk insert an array of new courses from a json file into
* the database. It then returns a Promise that resolves to a map of the IDs of the newly-created 
* course entries.
*/
async function bulkInsertNewCourses(courses) {
    const coursesToInsert = courses.map(function (course) {
        return extractValidFields(course, CourseSchema)
    })
    const db = getDbReference()
    const collection = db.collection('courses')
    const result = await collection.insertMany(coursesToInsert)
    return result.insertedIds
}
exports.bulkInsertNewCourses = bulkInsertNewCourses
