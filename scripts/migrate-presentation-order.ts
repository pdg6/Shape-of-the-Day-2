/**
 * One-Time Migration Script: Normalize presentationOrder
 * 
 * Run via: npx ts-node --project scripts/tsconfig.json scripts/migrate-presentation-order.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// ============================================
// CONFIGURATION
// ============================================

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../serviceAccountKey.json');
const ORDER_GAP = 10;

// ============================================
// INITIALIZATION
// ============================================

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ============================================
// MIGRATION LOGIC
// ============================================

interface TaskData {
    id: string;
    parentId: string | null;
    presentationOrder: number | undefined;
    createdAt: admin.firestore.Timestamp | undefined;
    title: string;
}

async function migratePresentationOrder(): Promise<void> {
    console.log('🚀 Starting presentationOrder migration...\n');

    // 1. Fetch all tasks
    const tasksSnapshot = await db.collection('tasks').get();
    const tasks: TaskData[] = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        parentId: doc.data().parentId || null,
        presentationOrder: doc.data().presentationOrder,
        createdAt: doc.data().createdAt,
        title: doc.data().title || '(untitled)'
    }));

    console.log(`📊 Found ${tasks.length} total tasks\n`);

    // 2. Group by parentId
    const groups = new Map<string, TaskData[]>();
    for (const task of tasks) {
        const key = task.parentId || '__ROOT__';
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(task);
    }

    console.log(`📁 Found ${groups.size} sibling groups\n`);

    // 3. Analyze and fix each group
    const updates: { id: string; newOrder: number; title: string }[] = [];

    for (const [parentId, siblings] of groups) {
        const groupName = parentId === '__ROOT__' ? 'Root Tasks' : `Children of ${parentId.slice(-6)}`;

        siblings.sort((a, b) => {
            const orderA = a.presentationOrder ?? Infinity;
            const orderB = b.presentationOrder ?? Infinity;
            if (orderA !== orderB) return orderA - orderB;
            const timeA = a.createdAt?.toMillis?.() ?? 0;
            const timeB = b.createdAt?.toMillis?.() ?? 0;
            return timeA - timeB;
        });

        const orders = siblings.map(t => t.presentationOrder);
        const hasDuplicates = orders.length !== new Set(orders.filter(o => o !== undefined)).size;
        const hasMissing = orders.some(o => o === undefined);

        if (hasDuplicates || hasMissing) {
            console.log(`⚠️  ${groupName}: ${siblings.length} tasks`);
            console.log(`    Orders: [${orders.map(o => o ?? 'undefined').join(', ')}]`);
            console.log(`    Issues: ${hasDuplicates ? 'DUPLICATES' : ''} ${hasMissing ? 'MISSING' : ''}`);

            siblings.forEach((task, index) => {
                const newOrder = (index + 1) * ORDER_GAP;
                if (task.presentationOrder !== newOrder) {
                    updates.push({ id: task.id, newOrder, title: task.title });
                }
            });

            console.log(`    → Will assign: [${siblings.map((_, i) => (i + 1) * ORDER_GAP).join(', ')}]\n`);
        }
    }

    // 4. Apply updates
    if (updates.length === 0) {
        console.log('✅ No updates needed - all presentationOrder values are already normalized!');
        return;
    }

    console.log(`\n📝 Total updates required: ${updates.length}`);
    console.log('\n🔄 Applying updates...');

    const BATCH_SIZE = 500;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = updates.slice(i, i + BATCH_SIZE);

        for (const update of chunk) {
            const ref = db.collection('tasks').doc(update.id);
            batch.update(ref, { presentationOrder: update.newOrder });
        }

        await batch.commit();
        console.log(`  ✓ Committed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(updates.length / BATCH_SIZE)}`);
    }

    console.log('\n✅ Migration complete!');
    console.log(`   Updated ${updates.length} tasks with normalized presentationOrder values.`);
}

// Run
migratePresentationOrder()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });
