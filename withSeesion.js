const { MongoClient } = require('mongodb');
const uri = 'mongodb://192.168.31.93:27017,192.168.31.93:27018/mongo-tx';
const successTest = async () => {
    const client = await MongoClient.connect(uri, { useNewUrlParser: true, replicaSet: 'rs2' });
    const db = client.db();
    // 删除表内老数据
    await db.collection('order').deleteMany({});
    await client.withSession(async session => {
        // await session.startTransaction();
        await session.startTransaction({
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' }
        });
        // 插入一条新数据
        await db.collection('order').insert({
            name: 'order10',
            total: 1000
        }, { session });
        await session.commitTransaction();
        session.endSession();
        count = await db.collection('order').countDocuments();
        console.log(`successTest-现在order表中有数据${count}条`);
    });
};

const rollbackTest = async () => {
    const client = await MongoClient.connect(uri, { useNewUrlParser: true, replicaSet: 'rs2' });
    const db = client.db();
    // 删除表内老数据
    await db.collection('order').deleteMany({});
    await client.withSession(async session => {
        try {
            await session.startTransaction({
                readConcern: { level: 'snapshot' },
                writeConcern: { w: 'majority' }
            });
            // 插入一条新数据
            await db.collection('order').insert({
                name: 'order10',
                total: 1000
            }, { session });
            // 模拟异常
            throw new Error('rollback');
            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
        } finally {
            session.endSession();
            count = await db.collection('order').countDocuments();
            console.log(`rollbackTest-现在order表中有数据${count}条`);
        }
    });
};


const main = async () => {
    await successTest();
    await rollbackTest();
};
main().then(() => {
    console.log('执行完成...');
    process.exit(0);
});