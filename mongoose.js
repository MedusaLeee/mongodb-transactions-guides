// 目前事务回滚只能在复制集上操作，单独的mongodb server是不能操作事务的, mongoose >= 5.2.0
const mongoose = require('mongoose');
const uri = 'mongodb://192.168.31.93:27017,192.168.31.93:27018/mongo-tx';
const oneTableTest = async () => {
    await mongoose.connect(uri, { useNewUrlParser: true, replicaSet: 'rs2' });
    const Order = mongoose.model('Order', new mongoose.Schema({
        name: String,
        total: Number
    }));
    await Order.remove({});
    let count = await Order.countDocuments({});
    console.log(`oneTableTest-现在order表中有数据${count}条`);
    // 正常事物
    let session = await mongoose.startSession();
    await session.startTransaction();
    await Order.create({
        name: 'order3',
        total: 150
    });
    await session.commitTransaction();
    session.endSession();
    count = await Order.countDocuments({});
    console.log(`oneTableTest-现在order表中有数据${count}条`);
    // 事物回滚
    session = await mongoose.startSession();
    await session.startTransaction();
    try {
        // 这种写法不行 create方法不接收 options参数,如果要接收options参数，第一参数必须为Array
        // 见文档 http://mongoosejs.com/docs/api.html#create_create
        // await Order.create({
        //     name: 'order4',
        //     total: 200
        // }, {session});
        // 这种写法可以
        // await Order({
        //     name: 'order4',
        //     total: 200
        // }).save({session});
        // 这种写法也可以
        await Order.create([{
            name: 'order4',
            total: 200
        }], {session});
        count = await Order.countDocuments({});
        console.log(`oneTableTest-现在order表中有数据${count}条`);
        // 抛出一个异常
        throw new Error('订单异常');
    } catch (e) {
        // 有异常，终止事物
        console.log('异常，回滚事物');
        await session.abortTransaction();
        session.endSession();
        count = await Order.countDocuments();
        console.log(`oneTableTest-现在order表中有数据${count}条`);
    }
};

oneTableTest().then();
