const express=require('express');
const cors=require('cors');
const bodyParser=require('body-parser');
const app=express();
const {db}=require('./config/firebase.config');
const {admin}=require('./config/firebase.config');
const PORT=5000;
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname, "../build")));
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

app.post('/api/claims', async (req, res) => {
    const {
        user_email,
        leave_details,
        claim_amount,
        research_progress,
        trf_workload,
        isAllocated,
        claim_month,
        claim_year
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
            created_at: admin.firestore.FieldValue.serverTimestamp()
        };

        // Save to 'claims' collection
        const docRef = await db.collection('claims').add(newClaim);

        return res.status(201).json({
            message: "Claim submitted successfully",
            claimId: docRef.id
        });
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


app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})
