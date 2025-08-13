// src/App.js
import { useState } from 'react';
import Signup from '../frontend/src/components/Signup';
import Login from '../frontend/src/components/Login';

function App() {
    // You can keep track of whether the user is logged in:
    const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token'));

    const handleLoginSuccess = () => {
        setLoggedIn(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setLoggedIn(false);
    };

    return (
        <div style={{ padding: '1rem' }}>
            <h1>FlashCards</h1>

            {loggedIn ? (
                <div>
                    <p>You are logged in!</p>
                    <button onClick={handleLogout}>Log Out</button>
                    {/* Here you could render a protected component, e.g. <FlashcardSets /> */}
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '2rem' }}>
                    <Signup />
                    <Login onLoginSuccess={handleLoginSuccess} />
                </div>
            )}
        </div>
    );
}


