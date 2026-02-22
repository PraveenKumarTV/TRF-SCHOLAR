const express=require('express');
const cors=require('cors');
const bodyParser=require('body-parser');
const app=express();
const {db}=require('./config/firebase.config');
const {admin}=require('./config/firebase.config');
const path=require('path');
const PORT=5000;
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.post('/login',(req,res)=>{
    const {email,password,role}=req.body;
    const snapshot=db.collection("scholarDetails")
    .where("email","==",email)
    .where("role","==",role)
    .get()
    .then((snapshot)=>{
        if(snapshot.empty){
            return res.status(401).json({message:"User not found"});
        }
        let userData=null;
        snapshot.forEach(doc=>{
            if(doc.data().password===password){
                userData={id:doc.id,...doc.data()};
            }
        });
        if(!userData){
            return res.status(401).json({message:"Invalid password"});
        }
        return res.status(200).json({message:"Login successful",user:userData});
    })
    .catch((error)=>{
        console.error("Error fetching user:",error);
        return res.status(500).json({message:"Server error"});
    });
})

app.get('/api/claims/status', async (req, res) => {
    const { email, month, year } = req.query;

    if (!email || !month || !year) {
        return res.status(400).json({ message: "Missing required query parameters" });
    }

    try {
        const snapshot = await db.collection('claims')
            .where('user_email', '==', email)
            .where('claim_month', '==', month)
            .where('claim_year', '==', year)
            .get();

        if (snapshot.empty) {
            return res.json({ submitted: false });
        }

        const doc = snapshot.docs[0];
        return res.json({ submitted: true, isAllocated: doc.data().isAllocated || false, claim: { id: doc.id, ...doc.data() } });
    } catch (error) {
        console.error("Error checking claim status:", error);
        return res.status(500).json({ message: "Server error" });
    }
});

app.post('/api/claims', async (req, res) => {
    const {
        user_email,
        leave_details,
        claim_amount,
        research_progress,
        trf_workload,
        isAllocated,
        claim_month,
        claim_year,
        attendance_certificate,
        progress_report,
        isSupervisorApproved,
        supervisorRejectionReason,
        isHodApproved,
        hodRejectionReason,
        isDlcApproved,
        dlcRejectionReason,
        isadminApproved,
        adminRejectionReason,
        resubmission_remarks
    } = req.body;

    if (!user_email || !claim_month || !claim_year) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const newClaim = {
            user_email,
            leave_details,
            claim_amount,
            research_progress,
            trf_workload,
            isAllocated: isAllocated || false,
            claim_month,
            claim_year,
            attendance_certificate: attendance_certificate || null,
            progress_report: progress_report || null,
            isSupervisorApproved: isSupervisorApproved || 'pending',
            supervisorRejectionReason: supervisorRejectionReason || null,
            isHodApproved: isHodApproved || 'pending',
            hodRejectionReason: hodRejectionReason || null,
            isDlcApproved: isDlcApproved || 'pending',
            dlcRejectionReason: dlcRejectionReason || null,
            isadminApproved: isadminApproved || 'pending',
            adminRejectionReason: adminRejectionReason || null,
            resubmission_remarks: resubmission_remarks || null,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        };

        // Check if claim already exists for this user, month, and year
        const snapshot = await db.collection('claims')
            .where('user_email', '==', user_email)
            .where('claim_month', '==', claim_month)
            .where('claim_year', '==', claim_year)
            .get();

        if (!snapshot.empty) {
            // Update existing claim
            const docId = snapshot.docs[0].id;
            await db.collection('claims').doc(docId).set(newClaim);
            return res.status(200).json({ message: "Claim resubmitted successfully", claimId: docId });
        } else {
            // Save new claim
            const docRef = await db.collection('claims').add(newClaim);
            return res.status(201).json({
                message: "Claim submitted successfully",
                claimId: docRef.id
            });
        }
    } catch (error) {
        console.error("Error submitting claim:", error);
        return res.status(500).json({ message: "Server error" });
    }
});

const incrementPublications = async (userEmail) => {
    try {
        // Query the scholarDetails collection for the document with the given email
        const snapshot = await db.collection('scholarDetails')
            .where('email', '==', userEmail)
            .get();

        if (snapshot.empty) {
            console.log('No user found with email:', userEmail);
            return;
        }

        // Since email is unique, there should be only one document
        snapshot.forEach(async (doc) => {
            await db.collection('scholarDetails').doc(doc.id).update({
                npublications: admin.firestore.FieldValue.increment(1)
            });
            console.log(`npublications incremented for user: ${userEmail}`);
        });
    } catch (error) {
        console.error('Error incrementing npublications:', error);
    }
};


app.post('/publications', async (req, res) => {
    const {
        email,
        category,
        title,
        authors,
        correspondingAuthor,
        venue,
        doi,
        year,
        volume,
        issue,
        pages,
        scopusIndexed,
        quartile,
        trfAcknowledgement,
        acknowledgementText,
        status
    } = req.body;

    // Basic validation
    if (!email || !title || !authors) {
        return res.status(400).json({ error: 'Missing required fields: email, title, or authors' });
    }

    try {
        const newPublication = {
            email,
            category: category || 'journal',
            title,
            authors,
            correspondingAuthor: correspondingAuthor || '',
            venue: venue || '',
            doi: doi || '',
            year: year || new Date().getFullYear(),
            volume: volume || '',
            issue: issue || '',
            pages: pages || '',
            scopusIndexed: scopusIndexed || false,
            quartile: quartile || '',
            trfAcknowledgement: trfAcknowledgement || false,
            acknowledgementText: acknowledgementText || '',
            status: status || 'submitted',
            created_at: admin.firestore.FieldValue.serverTimestamp()
        };

        // Save to 'publications' collection
        const docRef = await db.collection('Publications').add(newPublication);
        await incrementPublications(email);


        return res.status(201).json({
            message: 'Publication added successfully',
            publicationId: docRef.id
        });
    } catch (error) {
        console.error('Error adding publication:', error);
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/publications/my-publications', async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    try {
        const snapshot = await db.collection('Publications').where('email', '==', email).get();
        const publications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(publications);
    } catch (error) {
        console.error('Error fetching publications:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/publications/stats/my-stats', async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    try {
        const snapshot = await db.collection('Publications').where('email', '==', email).get();
        const publications = snapshot.docs.map(doc => doc.data());
        const stats = {
            total: publications.length,
            journals: publications.filter(p => p.category === 'journal').length,
            conferences: publications.filter(p => p.category === 'conference').length,
            scopusIndexed: publications.filter(p => p.scopusIndexed).length
        };
        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/publications/compliance/check', async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    try {
        const snapshot = await db.collection('Publications').where('email', '==', email).get();
        const publications = snapshot.docs.map(doc => doc.data());
        
        const scopusConferences = publications.filter(p => p.category === 'conference' && p.scopusIndexed).length;
        const journals = publications.filter(p => p.category === 'journal' && ['Q1', 'Q2', 'Q3'].includes(p.quartile)).length;
        
        res.json({
            scopusConferences: { current: scopusConferences, required: 2, met: scopusConferences >= 2 },
            journals: { current: journals, required: 1, met: journals >= 1 }
        });
    } catch (error) {
        console.error('Error checking compliance:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/publications/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        await db.collection('Publications').doc(id).update({
            ...data,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({ message: 'Publication updated successfully' });
    } catch (error) {
        console.error('Error updating publication:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/publications/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.collection('Publications').doc(id).delete();
        res.json({ message: 'Publication deleted successfully' });
    } catch (error) {
        console.error('Error deleting publication:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/getBankDetails', async (req, res) => {
    const { email } = req.query;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }
    try {
        const snapshot = await db.collection('scholarDetails').where('email', '==', email).get();
        if (snapshot.empty) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const userData = snapshot.docs[0].data();
        return res.status(200).json({ success: true, data: { bankDetails: userData.bankDetails || {} } });
    } catch (error) {
        console.error('Error fetching bank details:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/bankUpdate', async (req, res) => {
    const { email, bank_account, ifsc_code, bank_name, branch_name } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    try {
        // Query the scholarDetails collection to find the document with the given email
        const snapshot = await db.collection('scholarDetails').where('email', '==', email).get();

        if (snapshot.empty) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Assuming email is unique, update the first document found
        snapshot.forEach(async (doc) => {
            await db.collection('scholarDetails').doc(doc.id).update({
                bankDetails: {
                    accountNumber: bank_account || '',
                    ifscCode: ifsc_code || '',
                    bankName: bank_name || '',
                    branchName: branch_name || ''
                },
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        return res.status(200).json({ success: true, message: 'Bank details updated successfully' });

    } catch (error) {
        console.error('Error updating bank details:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});
app.get('/scholar/getBalCl', async (req, res) => {
    const { email } = req.query;
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }
    try {
        const snapshot = await db.collection('scholarDetails').where('email', '==', email).get();
        if (snapshot.empty) {
            return res.status(404).json({ message: "User not found" });
        }
        const doc = snapshot.docs[0];
        const userData = doc.data();
        // Default to 12 if balCl is not set in DB
        const balCl = userData.balCl !== undefined ? userData.balCl : 12;
        return res.status(200).json({ balCl });
    } catch (error) {
        console.error("Error fetching balCl:", error);
        return res.status(500).json({ message: "Server error" });
    }
});

app.post('/scholar/updateBalCl', async (req, res) => {
    const { email, usedCl } = req.body;
    if (!email || usedCl === undefined) {
        return res.status(400).json({ message: "Email and usedCl are required" });
    }
    try {
        const snapshot = await db.collection('scholarDetails').where('email', '==', email).get();
        if (snapshot.empty) {
            return res.status(404).json({ message: "User not found" });
        }
        const doc = snapshot.docs[0];
        const currentBal = doc.data().balCl !== undefined ? doc.data().balCl : 12;
        const newBal = currentBal - parseInt(usedCl);

        await db.collection('scholarDetails').doc(doc.id).update({
            balCl: newBal,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        return res.status(200).json({ message: "Balance updated successfully", balCl: newBal });
    } catch (error) {
        console.error("Error updating balCl:", error);
        return res.status(500).json({ message: "Server error" });
    }
});

app.use(express.static(path.join(__dirname, "../dist")));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../dist", "index.html"));
});

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})
