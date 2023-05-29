const { ObjectId } = require('mongodb')

const { getDbReference } = require('../lib/mongo')
const { extractValidFields } = require('../lib/validation')
const bcrypt = require('bcryptjs')

//Schema for Users

const UserSchema = {
    name: { required: true },
    email: { required: true },
    password: { required: true },
    role: { required: true }
}
exports.UserSchema = UserSchema

exports.insertNewUser = async function (user) {
    const db = getDbReference()
    const collection = db.collection('users')

    const result = await collection.insertOne(user)

    let newUser = extractValidFields(user, UserSchema)
    newUser.password = await bcrypt.hash(user.password, 8)
    console.log(newUser.password)

    return result.insertedId
}

exports.getUserByEmail = async function (email) {
    const db = getDbReference()
    const collection = db.collection('users')

    if (email) {
        const result = await collection.findOne({ email: email })
        console.log(result)
        return result
    } else {
        return null
    }
}


exports.bulkInsertNewUsers = async function bulkInsertNewUsers(users) {

    // encrypt passwords and extract fields
    usersToInsert = []
    for (let i in users) {
        users[i].password = await bcrypt.hash(users[i].password, 8).then()
        usersToInsert.push(extractValidFields(users[i], UserSchema))
    }

    console.log(usersToInsert)

    const db = getDbReference()
    const collection = db.collection('users')
    const result = await collection.insertMany(usersToInsert)
    return result.insertedIds
}


exports.getUserById = async function (id) {
    const db = getDbReference()
    const collection = db.collection('users')

   if (ObjectId.isValid(id)) {
        const result = await collection.findOne({ _id: new ObjectId(id) })
        return result
    } else {
        return null
    }
}
