// 目前事务回滚只能在副本集上操作，单独的mongodb server是不能操作事务的
const {MongoClient} = require('mongodb');
const uri = 'mongodb://192.168.31.93:27017,192.168.31.93:27018/mongo-tx';
const oneTableTest = async () => {
    const client = await MongoClient.connect(uri, {useNewUrlParser: true, replicaSet: 'rs2'});
    const db = client.db();
    // 删除表内老数据
    await db.collection('order').deleteMany({});
    // 成功完成一个事物
    // 开启事物
    let session = client.startSession();
    await session.startTransaction();
    // 插入一条新数据
    await db.collection('order').insert({
        name: 'order1',
        total: 50
    }, {session});
    await session.commitTransaction();
    session.endSession();
    let count = await db.collection('order').countDocuments();
    console.log(`oneTableTest-现在order表中有数据${count}条`);
    // 事物回滚
    // 开启事物
    session = client.startSession();
    await session.startTransaction();
    try {
        // 插入一个正确的订单
        await db.collection('order').insert({
            name: 'order2',
            total: 100
        }, {session}); // 每次操作都得带上 session
        count = await db.collection('order').countDocuments();
        console.log(`oneTableTest-现在order表中有数据${count}条`);
        // 抛出一个异常
        throw new Error('订单异常');
    } catch (e) {
        // 有异常，终止事物
        console.log('异常，回滚事物');
        // 执行完成后，发现name为order2的订单 没有插入数据库
        await session.abortTransaction();
        session.endSession();
        count = await db.collection('order').countDocuments();
        console.log(`oneTableTest-现在order表中有数据${count}条`);
    }
};

const multiTableTest = async () => {
    const client = await MongoClient.connect(uri, {useNewUrlParser: true, replicaSet: 'rs2'});
    const db = client.db();
    // 删除表内老数据
    await db.collection('order').deleteMany({});
    await db.collection('product').deleteMany({});
    // 插入一条新数据
    await db.collection('order').insert({
        name: 'order1',
        total: 50
    });
    await db.collection('product').insert({
        name: 'product1',
        price: 50
    });
    let orderCount = await db.collection('order').countDocuments();
    console.log(`multiTableTest-现在order表中有数据${orderCount}条`);
    let productCount = await db.collection('product').countDocuments();
    console.log(`multiTableTest-现在product表中有数据${productCount}条`);
    // 开启事物
    const session = client.startSession();
    await session.startTransaction();
    try {
        // 插入一个正确的订单
        await db.collection('order').insert({
            name: 'order2',
            total: 100
        }, {session}); // 每次操作都得带上 session
        // 插入一个正确的商品
        await db.collection('product').insert({
            name: 'product2',
            price: 100
        }, {session}); // 每次操作都得带上 session
        orderCount = await db.collection('order').countDocuments();
        console.log(`multiTableTest-现在order表中有数据${orderCount}条`);
        productCount = await db.collection('product').countDocuments();
        console.log(`multiTableTest-现在product表中有数据${productCount}条`);
        // 抛出一个异常
        throw new Error('多表异常');
    } catch (e) {
        // 有异常，终止事物
        console.log('多表异常，回滚事物');
        // 执行完成后，发现name为order2的订单，name为product2的商品都没有插入数据库
        await session.abortTransaction();
        session.endSession();
        orderCount = await db.collection('order').countDocuments();
        console.log(`multiTableTest-现在order表中有数据${orderCount}条`);
        productCount = await db.collection('product').countDocuments();
        console.log(`multiTableTest-现在product表中有数据${productCount}条`);
    }
};

const main = async () => {
    await oneTableTest();
    await multiTableTest();
};

main().then();
