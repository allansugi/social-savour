import request from 'supertest';
import { app, server } from '../server';
import { poolPromise } from '../db-config/db_connection';
import { db_clear } from '../db-config/db_clear';

// after all test done, it will stop pool connection
// otherwise jest won't exit
afterAll((done) => {
    server.close(() => {
        poolPromise.end()
        done();
    });
});

afterEach(async () => {
    await db_clear()
})

///////////////////////////////////////Sample Data//////////////////////////////////

// for basic test like login, address, and account router
const login = "uniquename@gmail.com"
const password = "test"

// address
const data = {
    street: "unicorn street",
    suburb: "dirtland",
    region: "NSW",
    postcode: "2025"
}

// for router where userId and restaurantId are required
const userLogin = "anotheraccount"
const userPassword = "anotherpassword"
const restaurantLogin = "uniquename@gmail.com"
const restaurantPassword = "test"

const userLoginData = {
    login: userLogin,
    password: userPassword
}

const eateryLoginData = {
    login: restaurantLogin,
    password: restaurantPassword
}

//////////////////////////////////////////////////////////////////////////////////////

describe('/user/booking', () => {
    let userLoginId;
    let eateryLoginId;
    let addressId;
    let restaurantId;
    let userId;
    let eateryAccount;
    let voucherId

    beforeEach(async () => {
        let response = await request(app).post("/api/user/account").send(eateryLoginData)
        eateryLoginId = response.body.data.insertId

        response = await request(app).post("/api/user/account").send(userLoginData)
        userLoginId = response.body.data.insertId
       
        // create address   
        response = await request(app).post('/api/user/address').send(data)
        addressId = response.body.data.insertId

        // create eatery account
        eateryAccount = {
            name: "another restaurant",
            addressId: addressId, //fake
            phone: "0493186858",
            email: "anotherrestaurant@gmail.com",
            loginId: eateryLoginId, 
            url: "www.anotherrestaurant.com",
        }

        // create user account
        const userAccount = {
            first: "first",
            last: "last",
            loginId: userLoginId,
            addressId: addressId //fake
        }

        response = await request(app).post("/api/user/eatery").send(eateryAccount);
        restaurantId = response.body.results.insertId

        response = await request(app).post("/api/user/user").send(userAccount)
        userId = response.body.data.insertId

        const start = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const currentDate = new Date();

        // Calculate the date 5 days from now
        let fiveDaysFromNow = new Date(currentDate);
        fiveDaysFromNow.setDate(currentDate.getDate() + 5);

        // Format the date for MySQL datetime (YYYY-MM-DD HH:MM:SS)
        const end = fiveDaysFromNow.toISOString().slice(0, 19).replace('T', ' ');

        // input for voucher
        // leave code null
        const voucherData = {
            offeredBy: restaurantId,
            discount: 50,
            startOffer: start,
            endOffer: end,
            count: 1,
            code: 'ABCD'
        }

        response = await request(app).post('/api/user/voucher').send(voucherData);
        voucherId = response.body.results[0].insertId
    })

    test('successful booking within time range will return statuscode 200 and success of 1', async () => {

        // Calculate the date 3 days from now
        const userDate = new Date();
        // console.log(userDate);

        let threeDaysFromNow = new Date(userDate);
        threeDaysFromNow.setDate(userDate.getDate() + 3);

        const bookingData = {
            userId: userId,
            restaurantId: restaurantId,
            voucherId: voucherId,
            bookingTime: threeDaysFromNow
        }

        const response = await request(app).post('/api/user/user/booking').send(bookingData);
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(1);
    })

    test('booking earlier than the time start will return statuscode 409 and success of 0', async () => {
        // Calculate the date 3 days from now
        const userDate = new Date()
        let earlyDate = new Date(userDate);
        earlyDate.setDate(userDate.getDate() - 1);

        const bookingData = {
            userId: userId,
            restaurantId: restaurantId,
            voucherId: voucherId,
            bookingTime: earlyDate
        }

        const response = await request(app).post('/api/user/user/booking').send(bookingData);
        expect(response.statusCode).toBe(409);
        expect(response.body.success).toBe(0);
    })

    test('booking alter than the time end will return statuscode 409 and success of 0', async () => {
        // Calculate the date 3 days from now
        const userDate = new Date()
        let laterDate = new Date(userDate);
        laterDate.setDate(userDate.getDate() - 20);

        const bookingData = {
            userId: userId,
            restaurantId: restaurantId,
            voucherId: voucherId,
            bookingTime: laterDate
        }

        const response = await request(app).post('/api/user/user/booking').send(bookingData);
        expect(response.statusCode).toBe(409);
        expect(response.body.success).toBe(0);
    })

    test('successful booking will decrease the amount of voucher by 1', async () => {

        let [searchQuery] = await poolPromise.execute('select count from Voucher where id = ?', [voucherId]);
        expect(searchQuery[0].count).toBe(1)

        // Calculate the date 3 days from now
        const userDate = new Date();
        // console.log(userDate);

        let threeDaysFromNow = new Date(userDate);
        threeDaysFromNow.setDate(userDate.getDate() + 3);

        const bookingData = {
            userId: userId,
            restaurantId: restaurantId,
            voucherId: voucherId,
            bookingTime: threeDaysFromNow
        }

        let response = await request(app).post('/api/user/user/booking').send(bookingData);
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(1);

        [searchQuery] = await poolPromise.execute('select count from Voucher where id = ?', [voucherId]);
        expect(searchQuery[0].count).toBe(0)
    })

    test('booking when the voucher are all booked will return statuscode 409 and sucess 0', async () => {

        // Calculate the date 3 days from now
        const userDate = new Date();
        // console.log(userDate);

        let threeDaysFromNow = new Date(userDate);
        threeDaysFromNow.setDate(userDate.getDate() + 3);

        const bookingData = {
            userId: userId,
            restaurantId: restaurantId,
            voucherId: voucherId,
            bookingTime: threeDaysFromNow
        }

        let response = await request(app).post('/api/user/user/booking').send(bookingData);
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(1);

        response = await request(app).post('/api/user/user/booking').send(bookingData);
        expect(response.statusCode).toBe(409);
        expect(response.body.success).toBe(0);
    })
})

describe('/user/bookings/:id', () => {
    let userLoginId;
    let eateryLoginId;
    let addressId;
    let restaurantId;
    let userId;
    let eateryAccount;
    let voucherId

    beforeEach(async () => {
        let response = await request(app).post("/api/user/account").send(eateryLoginData)
        eateryLoginId = response.body.data.insertId

        response = await request(app).post("/api/user/account").send(userLoginData)
        userLoginId = response.body.data.insertId
       
        // create address   
        response = await request(app).post('/api/user/address').send(data)
        addressId = response.body.data.insertId

        // create eatery account
        eateryAccount = {
            name: "another restaurant",
            addressId: addressId, //fake
            phone: "0493186858",
            email: "anotherrestaurant@gmail.com",
            loginId: eateryLoginId, 
            url: "www.anotherrestaurant.com",
        }

        // create user account
        const userAccount = {
            first: "first",
            last: "last",
            loginId: userLoginId,
            addressId: addressId //fake
        }

        response = await request(app).post("/api/user/eatery").send(eateryAccount);
        restaurantId = response.body.results.insertId

        response = await request(app).post("/api/user/user").send(userAccount)
        userId = response.body.data.insertId

        const start = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const currentDate = new Date();

        // Calculate the date 5 days from now
        let fiveDaysFromNow = new Date(currentDate);
        fiveDaysFromNow.setDate(currentDate.getDate() + 5);

        // Format the date for MySQL datetime (YYYY-MM-DD HH:MM:SS)
        const end = fiveDaysFromNow.toISOString().slice(0, 19).replace('T', ' ');

        // input for voucher
        // leave code null
        const voucherData = {
            offeredBy: restaurantId,
            discount: 50,
            startOffer: start,
            endOffer: end,
            count: 1,
            code: 'ABCD'
        }

        response = await request(app).post('/api/user/voucher').send(voucherData);
        voucherId = response.body.results[0].insertId
    })

    test('if find any bookings, return statuscode 200 and success of 1 with the result', async () => {

        // Calculate the date 3 days from now
        const userDate = new Date();
        // console.log(userDate);

        let threeDaysFromNow = new Date(userDate);
        threeDaysFromNow.setDate(userDate.getDate() + 3);

        const bookingData = {
            userId: userId,
            restaurantId: restaurantId,
            voucherId: voucherId,
            bookingTime: threeDaysFromNow
        }

        let response = await request(app).post('/api/user/user/booking').send(bookingData);
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(1);

        response = await request(app).get(`/api/user/user/bookings/${userId}`)
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(1);
        expect(response.body.data.length).toBe(1);
    })

    test('if not find any bookings, return statuscode 404 and success of 0 with messages', async () => {
        const response = await request(app).get(`/api/user/user/bookings/${userId}`)
        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(0);
    })
})

describe('/eatery/booking/verify', () => {
    let userLoginId;
    let eateryLoginId;
    let addressId;
    let restaurantId;
    let userId;
    let eateryAccount;
    let voucherId
    let sampleCode = 'ABCD'

    beforeEach(async () => {
        let response = await request(app).post("/api/user/account").send(eateryLoginData)
        eateryLoginId = response.body.data.insertId

        response = await request(app).post("/api/user/account").send(userLoginData)
        userLoginId = response.body.data.insertId
       
        // create address   
        response = await request(app).post('/api/user/address').send(data)
        addressId = response.body.data.insertId

        // create eatery account
        eateryAccount = {
            name: "another restaurant",
            addressId: addressId, //fake
            phone: "0493186858",
            email: "anotherrestaurant@gmail.com",
            loginId: eateryLoginId, 
            url: "www.anotherrestaurant.com",
        }

        // create user account
        const userAccount = {
            first: "first",
            last: "last",
            loginId: userLoginId,
            addressId: addressId //fake
        }

        response = await request(app).post("/api/user/eatery").send(eateryAccount);
        restaurantId = response.body.results.insertId

        response = await request(app).post("/api/user/user").send(userAccount)
        userId = response.body.data.insertId

        const start = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const currentDate = new Date();

        // Calculate the date 5 days from now
        let fiveDaysFromNow = new Date(currentDate);
        fiveDaysFromNow.setDate(currentDate.getDate() + 5);

        // Format the date for MySQL datetime (YYYY-MM-DD HH:MM:SS)
        const end = fiveDaysFromNow.toISOString().slice(0, 19).replace('T', ' ');

        // input for voucher
        // leave code null
        const voucherData = {
            offeredBy: restaurantId,
            discount: 50,
            startOffer: start,
            endOffer: end,
            count: 1,
            code: sampleCode
        }

        response = await request(app).post('/api/user/voucher').send(voucherData);
        voucherId = response.body.results[0].insertId
    })

    test('verify correct code should return statuscode 200 and success of 1', async () => {
        // Calculate the date 3 days from now
        const userDate = new Date();
        // console.log(userDate);

        let threeDaysFromNow = new Date(userDate);
        threeDaysFromNow.setDate(userDate.getDate() + 3);

        const bookingData = {
            userId: userId,
            restaurantId: restaurantId,
            voucherId: voucherId,
            bookingTime: threeDaysFromNow
        }

        await request(app).post('/api/user/user/booking').send(bookingData);

        const verifyData = {
            code: sampleCode,
            restaurantId: restaurantId
        }

        const response = await request(app).put('/api/user/eatery/booking/verify').send(verifyData)
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(1);
    })

    test('verify incorrect code should return statuscode 404 and success of 0', async () => {
        // Calculate the date 3 days from now
        const userDate = new Date();
        // console.log(userDate);

        let threeDaysFromNow = new Date(userDate);
        threeDaysFromNow.setDate(userDate.getDate() + 3);

        const bookingData = {
            userId: userId,
            restaurantId: restaurantId,
            voucherId: voucherId,
            bookingTime: threeDaysFromNow
        }

        await request(app).post('/api/user/user/booking').send(bookingData);

        const verifyData = {
            code: sampleCode + 'E',
            restaurantId: restaurantId
        }

        const response = await request(app).put('/api/user/eatery/booking/verify').send(verifyData)
        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(0);
    })

    test('verify correct code but incorrect restaurantId should return statuscode 404 and success of 0', async () => {
        // Calculate the date 3 days from now
        const userDate = new Date();
        // console.log(userDate);

        let threeDaysFromNow = new Date(userDate);
        threeDaysFromNow.setDate(userDate.getDate() + 3);

        const bookingData = {
            userId: userId,
            restaurantId: restaurantId,
            voucherId: voucherId,
            bookingTime: threeDaysFromNow
        }

        await request(app).post('/api/user/user/booking').send(bookingData);

        const verifyData = {
            code: sampleCode,
            restaurantId: restaurantId + 2
        }

        const response = await request(app).put('/api/user/eatery/booking/verify').send(verifyData)
        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(0);
    })

    test('voucher that has been verified should return statuscode 404 and success of 0', async () => {
        // Calculate the date 3 days from now
        const userDate = new Date();
        // console.log(userDate);

        let threeDaysFromNow = new Date(userDate);
        threeDaysFromNow.setDate(userDate.getDate() + 3);

        const bookingData = {
            userId: userId,
            restaurantId: restaurantId,
            voucherId: voucherId,
            bookingTime: threeDaysFromNow
        }

        await request(app).post('/api/user/user/booking').send(bookingData);

        const verifyData = {
            code: sampleCode,
            restaurantId: restaurantId
        }

        let response = await request(app).put('/api/user/eatery/booking/verify').send(verifyData)
        response = await request(app).put('/api/user/eatery/booking/verify').send(verifyData)
        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(0);
    })
})