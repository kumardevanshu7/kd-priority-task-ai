/* === FIREBASE SERVICE === */

// Firebase Service Class
class FirebaseService {
  constructor() {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.currentUser = null;
    this.authCheckComplete = false;
  }

  // Initialize Firebase
  async initialize() {
    try {
      // Initialize Firebase App
      this.app = firebase.initializeApp(firebaseConfig);
      
      // Initialize services
      this.auth = firebase.auth();
      this.db = firebase.firestore();
      
      // Set up auth state listener
      this.setupAuthListener();
      
      console.log('Firebase initialized successfully');
      return true;
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      throw error;
    }
  }

  // Set up authentication state listener
  setupAuthListener() {
    this.auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      this.authCheckComplete = true;
      
      if (user) {
        console.log('User authenticated:', user.email);
        this.onAuthSuccess(user);
      } else {
        console.log('User not authenticated');
        this.onAuthFailure();
      }
    });
  }

  // Authentication success callback
  onAuthSuccess(user) {
    // Override in main app
  }

  // Authentication failure callback  
  onAuthFailure() {
    // Override in main app
  }

  // Sign up with email and password
  async signUp(email, password) {
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: this.getAuthErrorMessage(error.code) };
    }
  }

  // Sign in with email and password
  async signIn(email, password) {
    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: this.getAuthErrorMessage(error.code) };
    }
  }

  // Sign out
  async signOut() {
    try {
      await this.auth.signOut();
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  // Reset password
  async resetPassword(email) {
    try {
      await this.auth.sendPasswordResetEmail(email);
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: this.getAuthErrorMessage(error.code) };
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser;
  }

  // Save document to Firestore
  async saveDocument(collection, docId, data) {
    try {
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      const docRef = this.db.collection(collection).doc(docId);
      await docRef.set({
        ...data,
        lastUpdated: firebase.firestore.Timestamp.now(),
        userId: this.currentUser.uid
      });

      return { success: true };
    } catch (error) {
      console.error('Save document error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get document from Firestore
  async getDocument(collection, docId) {
    try {
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      const docRef = this.db.collection(collection).doc(docId);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        return { success: true, data: docSnap.data() };
      } else {
        return { success: true, data: null };
      }
    } catch (error) {
      console.error('Get document error:', error);
      return { success: false, error: error.message };
    }
  }

  // Update document in Firestore
  async updateDocument(collection, docId, data) {
    try {
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      const docRef = this.db.collection(collection).doc(docId);
      await docRef.update({
        ...data,
        lastUpdated: firebase.firestore.Timestamp.now()
      });

      return { success: true };
    } catch (error) {
      console.error('Update document error:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete document from Firestore
  async deleteDocument(collection, docId) {
    try {
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      const docRef = this.db.collection(collection).doc(docId);
      await docRef.delete();

      return { success: true };
    } catch (error) {
      console.error('Delete document error:', error);
      return { success: false, error: error.message };
    }
  }

  // Query documents from Firestore
  async queryDocuments(collection, queries = []) {
    try {
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      let query = this.db.collection(collection);
      
      // Apply queries
      queries.forEach(({ field, operator, value }) => {
        query = query.where(field, operator, value);
      });

      const querySnapshot = await query.get();
      const documents = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return { success: true, data: documents };
    } catch (error) {
      console.error('Query documents error:', error);
      return { success: false, error: error.message };
    }
  }

  // Save user profile
  async saveUserProfile(profileData) {
    try {
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      const docId = this.currentUser.uid;
      return await this.saveDocument('userProfiles', docId, profileData);
    } catch (error) {
      console.error('Save user profile error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user profile
  async getUserProfile() {
    try {
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      const docId = this.currentUser.uid;
      return await this.getDocument('userProfiles', docId);
    } catch (error) {
      console.error('Get user profile error:', error);
      return { success: false, error: error.message };
    }
  }

  // Save daily tasks
  async saveDailyTasks(date, tasksData) {
    try {
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      const dateKey = DateUtils.formatDate(date);
      const docId = `${this.currentUser.uid}-${dateKey}`;
      
      return await this.saveDocument('dailyTasks', docId, tasksData);
    } catch (error) {
      console.error('Save daily tasks error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get daily tasks
  async getDailyTasks(date) {
    try {
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      const dateKey = DateUtils.formatDate(date);
      const docId = `${this.currentUser.uid}-${dateKey}`;
      
      return await this.getDocument('dailyTasks', docId);
    } catch (error) {
      console.error('Get daily tasks error:', error);
      return { success: false, error: error.message };
    }
  }

  // Save mood data
  async saveMoodData(date, mood, emoji, taskText) {
    try {
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      const dateKey = DateUtils.formatDate(date);
      const docId = `${this.currentUser.uid}-${dateKey}`;
      
      // Get existing mood data
      const result = await this.getDocument('user-moods', docId);
      let moodData = result.success && result.data ? result.data : { moods: [] };

      // Add new mood entry
      moodData.moods.push({
        mood: mood,
        emoji: emoji,
        task: taskText,
        timestamp: new Date().toISOString()
      });

      return await this.saveDocument('user-moods', docId, moodData);
    } catch (error) {
      console.error('Save mood data error:', error);
      return { success: false, error: error.message };
    }
  }

  // Save streak data
  async saveStreakData(streakData) {
    try {
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      const docId = this.currentUser.uid;
      return await this.saveDocument('userStreaks', docId, streakData);
    } catch (error) {
      console.error('Save streak data error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get streak data
  async getStreakData() {
    try {
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      const docId = this.currentUser.uid;
      return await this.getDocument('userStreaks', docId);
    } catch (error) {
      console.error('Get streak data error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get authentication error message
  getAuthErrorMessage(errorCode) {
    const errorMessages = {
      'auth/invalid-email': ERROR_MESSAGES.auth.invalidEmail,
      'auth/weak-password': ERROR_MESSAGES.auth.weakPassword,
      'auth/user-not-found': ERROR_MESSAGES.auth.userNotFound,
      'auth/wrong-password': ERROR_MESSAGES.auth.wrongPassword,
      'auth/email-already-in-use': ERROR_MESSAGES.auth.emailInUse,
      'auth/network-request-failed': ERROR_MESSAGES.auth.networkError
    };

    return errorMessages[errorCode] || ERROR_MESSAGES.general.unexpected;
  }

  // Batch operations
  async batchWrite(operations) {
    try {
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      const batch = this.db.batch();
      
      operations.forEach(({ type, collection, docId, data }) => {
        const docRef = this.db.collection(collection).doc(docId);
        
        switch (type) {
          case 'set':
            batch.set(docRef, {
              ...data,
              lastUpdated: firebase.firestore.Timestamp.now(),
              userId: this.currentUser.uid
            });
            break;
          case 'update':
            batch.update(docRef, {
              ...data,
              lastUpdated: firebase.firestore.Timestamp.now()
            });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Batch write error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create global Firebase service instance
const firebaseService = new FirebaseService();
