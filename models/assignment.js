const { ObjectId } = require('mongodb')

const { getDbReference } = require('../lib/mongo')
const { extractValidFields } = require('../lib/validation')

//Schema for Assignment

const AssignmentSchema = {
    courseId: { required: true },
    title: { required: true },
    points: { required: true },
    dueDate: { required: true }
}
exports.AssignmentSchema = AssignmentSchema

exports.insertNewAssignment = async function (assignment) {
    const db = getDbReference()
    const collection = db.collection('assignments')

    let newAssignment = extractValidFields(assignment, AssignmentSchema)

    const result = await collection.insertOne(newAssignment)

    return result.insertedId
}

exports.getAssignmentById = async function (id) {
    const db = getDbReference()
    const collection = db.collection('assignments')

    if (ObjectId.isValid(id)) {
        const results = await collection.findOne({ _id: new ObjectId(id) })
        return results
    } else {
        return null
    }
}

exports.getAssignments = async function (id) {
    const db = getDbReference()
    const collection = db.collection('assignments')
    //console.log(ObjectId.isValid(id))
    if (ObjectId.isValid(id)) {
        const results = await collection.find({ 'courseId': id }).toArray()
        console.log("results: ", results[0])
        return results  
    } else {
        return null
    }
}

exports.updateAssignmentById = async function (id, assignment) {
    const db = getDbReference()
    const collection = db.collection('assignments')

    if (ObjectId.isValid(id)) {
        const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: assignment })
        return result.matchedCount > 0 
    } else {
        return null
    }
}

exports.deleteAssignmentById = async function (id) {
    const db = getDbReference()
    const collection = db.collection('assignments')

    if (ObjectId.isValid(id)) {
        const result = await collection.deleteOne({ _id: new ObjectId(id) })
        return result.deletedCount > 0
    } else {
        return null
    }
}