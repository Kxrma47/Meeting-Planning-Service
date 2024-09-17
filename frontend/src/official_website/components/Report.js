import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import styles from './Report.module.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const Report = () => {
    const [clientReports, setClientReports] = useState([]);
    const [ownerReports, setOwnerReports] = useState([]);
    const [timeFilter, setTimeFilter] = useState('daily');
    const history = useHistory();

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await fetch(`/api/reports?time_filter=${timeFilter}`);
                if (response.ok) {
                    const data = await response.json();
                    setClientReports(data.clientReports);
                    setOwnerReports(data.ownerReports);
                } else {
                    console.error('Failed to fetch reports');
                }
            } catch (error) {
                console.error('Error fetching reports:', error);
            }
        };

        fetchReports();
    }, [timeFilter]);

    useEffect(() => {
        const checkSession = async () => {
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

        checkSession();
    }, [history]);

    const clientChartData = {
        labels: ['Daily', 'Weekly', 'Monthly', 'Yearly'],
        datasets: [
            {
                label: 'Client Complaints',
                data: [clientReports.length],
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1,
            },
        ],
    };

    const ownerChartData = {
        labels: ['Daily', 'Weekly', 'Monthly', 'Yearly'],
        datasets: [
            {
                label: 'Complaints Against Business Owners',
                data: [ownerReports.length],
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
            },
        ],
    };

    const handleBackClick = () => {
        history.push('/admin/dashboard');
    };

    const handleTimeFilterChange = (event) => {
        setTimeFilter(event.target.value);
    };

    return (
        <div className={styles.reportPage}>
            <h1>Reports Dashboard</h1>
            <button onClick={handleBackClick} className={styles.backButton}>
                Back to Dashboard
            </button>
            <div className={styles.filterContainer}>
                <label>Time Filter:</label>
                <select value={timeFilter} onChange={handleTimeFilterChange}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                </select>
            </div>
            <div className={styles.chartsContainer}>
                <div className={styles.chartSection}>
                    <h2>Complaints Against Business Owners</h2>
                    <Bar data={ownerChartData} />
                </div>
                <div className={styles.chartSection}>
                    <h2>Client Complaints</h2>
                    <Bar data={clientChartData} />
                </div>
            </div>
            <div className={styles.tablesContainer}>
                <div className={styles.tableSection}>
                    <h2>Business Owner Reports</h2>
                    <table className={styles.reportTable}>
                        <thead>
                            <tr>
                                <th>Owner Name</th>
                                <th>Company Name</th>
                                <th>Owner Email</th>
                                <th>Owner Phone Number</th>
                                <th>Client Phone Number</th>
                                <th>Complained Client</th>
                                <th>Services</th>
                                <th>Service Time</th>
                                <th>Total Cost</th>
                                <th>Complaint</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ownerReports.map((report, index) => (
                                <tr key={index}>
                                    <td>{report.ownerName}</td>
                                    <td>{report.companyName}</td>
                                    <td>{report.ownerEmail}</td>
                                    <td>{report.ownerPhone}</td>
                                    <td>{report.clientPhone}</td>
                                    <td>{report.complainedClient}</td>
                                    <td>{report.services}</td>
                                    <td>{new Date(report.serviceTime).toLocaleString()}</td>
                                    <td>${report.totalCost}</td>
                                    <td>{report.complaint}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className={styles.tableSection}>
                    <h2>Reports Against Business Owner</h2>
                    <table className={styles.reportTable}>
                        <thead>
                            <tr>
                                <th>Client Name</th>
                                <th>Email</th>
                                <th>Phone Number</th>
                                <th>Complained Shop</th>
                                <th>Complaint</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientReports.map((report, index) => (
                                <tr key={index}>
                                    <td>{report.clientName}</td>
                                    <td>{report.clientEmail}</td>
                                    <td>{report.clientPhone}</td>
                                    <td>{report.companyName}</td>
                                    <td>{report.complaint}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Report;
