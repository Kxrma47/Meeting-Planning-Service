import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import '../components/New.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const New = () => {
    const [messages, setMessages] = useState([]);
    const [filteredMessages, setFilteredMessages] = useState([]);
    const [filter, setFilter] = useState({ sort: 'latest', timeRange: 'daily' });
    const [chartData, setChartData] = useState({ daily: [], weekly: [], monthly: [] });
    const history = useHistory();

    const handleCheckboxChange = async (messageId, responded) => {
        try {
            await fetch(`/api/contact_messages/${messageId}/responded`, {
                method: 'PATCH',
            });


            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg.id === messageId
                        ? { ...msg, responded: !responded }
                        : msg
                )
            );
        } catch (error) {
            console.error('Error updating responded status:', error);
        }
    };


    useEffect(() => {
        const checkAdminSession = async () => {
            try {
                const response = await fetch('/api/admin/check_session');
                const data = await response.json();
                if (!data.authenticated) {
                    history.push('/admin/login');
                }
            } catch (error) {
                console.error('Error checking session:', error);
                history.push('/admin/login');
            }
        };

        checkAdminSession();
    }, [history]);


    const fetchMessages = async () => {
        try {
            const response = await fetch('/api/contact_messages');
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.indexOf('application/json') !== -1) {
                const data = await response.json();
                console.log('Data fetched:', data);
                if (Array.isArray(data)) {
                    setMessages(data);
                    setFilteredMessages(data);
                    generateChartData(data);
                } else {
                    console.error('Expected an array, but got:', data);
                }
            } else {
                console.error('Response is not JSON:', response);
            }
        } catch (error) {
            console.error('Error fetching contact messages:', error);
        }
    };
    useEffect(() => {
        fetchMessages();
    }, []);







    useEffect(() => {
        let sortedMessages = [...messages];

        if (filter.sort === 'latest') {
            sortedMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else {
            sortedMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }

        setFilteredMessages(sortedMessages);
    }, [filter, messages]);

    const generateChartData = (data) => {
        if (!Array.isArray(data)) {
            console.error('Invalid data type, expected an array:', data);
            return;
        }

        const dailyCounts = {};
        const weeklyCounts = {};
        const monthlyCounts = {};

        data.forEach(msg => {
            const date = new Date(msg.created_at);
            if (isNaN(date)) {
                console.error('Invalid date:', msg.created_at);
                return;
            }
            const dateString = date.toLocaleDateString();
            const week = getWeek(date);
            const month = date.getMonth() + 1;

            if (!dailyCounts[dateString]) dailyCounts[dateString] = 0;
            dailyCounts[dateString]++;

            if (!weeklyCounts[week]) weeklyCounts[week] = 0;
            weeklyCounts[week]++;

            if (!monthlyCounts[month]) monthlyCounts[month] = 0;
            monthlyCounts[month]++;
        });

        console.log('Daily Counts:', dailyCounts);
        console.log('Weekly Counts:', weeklyCounts);
        console.log('Monthly Counts:', monthlyCounts);

        setChartData({
            daily: Object.values(dailyCounts),
            weekly: Object.values(weeklyCounts),
            monthly: Object.values(monthlyCounts),
        });
    };



    const getWeek = (date) => {
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - startOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    };

    const handleFilterChange = (e) => {
        setFilter({
            ...filter,
            [e.target.name]: e.target.value,
        });
    };

    const lineChartData = {
        labels: Object.keys(chartData.daily),
        datasets: [
            {
                label: 'Daily',
                data: chartData.daily,
                borderColor: 'rgba(75, 192, 192, 1)',
                fill: false,
            },
            {
                label: 'Weekly',
                data: chartData.weekly,
                borderColor: 'rgba(153, 102, 255, 1)',
                fill: false,
            },
            {
                label: 'Monthly',
                data: chartData.monthly,
                borderColor: 'rgba(255, 159, 64, 1)',
                fill: false,
            },
        ],
    };

    const handleBackToDashboard = () => {
        history.push('/admin/dashboard');
    };

    return (
        <div className="new-page">
            <main className="main-content">
                <div className="back-button-container">
                    <button className="backButton" onClick={handleBackToDashboard}>
                        Back to Dashboard
                    </button>
                </div>
                <div className="filter-container">
                    <label>Sort by:</label>
                    <select name="sort" value={filter.sort} onChange={handleFilterChange}>
                        <option value="latest">Latest</option>
                        <option value="oldest">Oldest</option>
                    </select>
                    <label>Time range:</label>
                    <select name="timeRange" value={filter.timeRange} onChange={handleFilterChange}>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>
                <div className="chart-section">
                    <h2>Contact Messages Over Time</h2>
                    <Line data={lineChartData} />
                </div>
                <table className="messages-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Message</th>
                            <th>Created At</th>
                            <th>Responded</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMessages.map((msg, index) => (
                            <tr key={index}>
                                <td>{msg.name}</td>
                                <td>{msg.email}</td>
                                <td>{msg.message}</td>
                                <td>{new Date(msg.created_at).toLocaleDateString()}</td>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={msg.responded}
                                        onChange={() => handleCheckboxChange(msg.id, msg.responded)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>


                </table>
            </main>
        </div>
    );
};

export default New;
