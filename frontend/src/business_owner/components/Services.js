import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import styles from './Services.module.css';

const ServicesPage = () => {
    const [services, setServices] = useState([]);
    const [newService, setNewService] = useState({ title: '', cost: '', description: '', service_time: '' });
    const history = useHistory();

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const response = await fetch('/api/business_owner/services');
                if (response.ok) {
                    const servicesData = await response.json();
                    setServices(servicesData);
                } else if (response.status === 401) {
                    history.push('/business-owner/login');
                } else {
                    console.error('Failed to fetch services');
                }
            } catch (error) {
                console.error('Error fetching services:', error);
            }
        };

        fetchServices();
    }, [history]);

    const handleServiceChange = (id, field, value) => {
        setServices(services.map(service =>
            service.id === id ? { ...service, [field]: value } : service
        ));
    };

    const handleNewServiceChange = (field, value) => {
        setNewService({ ...newService, [field]: value });
    };

    const addService = async () => {
        try {
            const response = await fetch('/api/business_owner/services', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newService)
            });

            if (response.ok) {
                const addedService = await response.json();
                setServices([...services, addedService.service]);
                setNewService({ title: '', cost: '', description: '', service_time: '' });
            } else {
                console.error('Failed to add service');
            }
        } catch (error) {
            console.error('Error adding service:', error);
        }
    };

    const deleteService = async (id) => {
        try {
            const response = await fetch(`/api/business_owner/services?id=${id}`, { method: 'DELETE' });

            if (response.ok) {
                setServices(services.filter(service => service.id !== id));
            } else {
                console.error('Failed to delete service');
            }
        } catch (error) {
            console.error('Error deleting service:', error);
        }
    };

    const confirmService = async (id) => {
        const serviceToUpdate = services.find(service => service.id === id);
        try {
            const response = await fetch('/api/business_owner/services', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(serviceToUpdate)
            });

            if (response.ok) {
                console.log('Service confirmed:', serviceToUpdate);
            } else {
                console.error('Failed to confirm service');
            }
        } catch (error) {
            console.error('Error confirming service:', error);
        }
    };

    const handleLogout = async () => {
        try {
            const response = await fetch('/api/business_owner/logout', { method: 'POST' });
            if (response.ok) {
                history.push('/business-owner/login');
            } else {
                alert('Logout failed. Please try again.');
            }
        } catch (error) {
            console.error('Error during logout:', error);
            alert('An error occurred. Please try again.');
        }
    };

    return (
        <div className={styles.servicesContainer}>
            <header className={styles.header}>
                <nav className={styles.nav}>
                    <ul>
                        <li><Link to="/business-owner/dashboard">Dashboard</Link></li>
                        <li><Link to="/business-owner/services">Services</Link></li>
                        <li><Link to="/business-owner/faq">FAQ</Link></li>
                        <li><Link to="/business-owner/support">Support</Link></li>
                    </ul>
                    <button onClick={handleLogout} className={styles.logoutButton}>Logout</button>
                </nav>
                <h1>Manage Services</h1>
            </header>
            <main className={styles.mainContent}>
                <div className={styles.addService}>
                    <h3>Add New Service</h3>
                    <input
                        type="text"
                        placeholder="Title"
                        value={newService.title}
                        onChange={(e) => handleNewServiceChange('title', e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Cost"
                        value={newService.cost}
                        onChange={(e) => handleNewServiceChange('cost', e.target.value)}
                    />
                    <textarea
                        placeholder="Description"
                        value={newService.description}
                        onChange={(e) => handleNewServiceChange('description', e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Service Time"
                        value={newService.service_time}
                        onChange={(e) => handleNewServiceChange('service_time', e.target.value)}
                    />
                    <button onClick={addService}>Add Service</button>
                </div>
                {services.map(service => (
                    <div key={service.id} className={styles.serviceItem}>
                        <input
                            type="text"
                            value={service.title}
                            onChange={(e) => handleServiceChange(service.id, 'title', e.target.value)}
                        />
                        <input
                            type="text"
                            value={service.cost}
                            onChange={(e) => handleServiceChange(service.id, 'cost', e.target.value)}
                        />
                        <textarea
                            value={service.description}
                            onChange={(e) => handleServiceChange(service.id, 'description', e.target.value)}
                        />
                        <input
                            type="text"
                            value={service.service_time}
                            onChange={(e) => handleServiceChange(service.id, 'service_time', e.target.value)}
                        />
                        <button onClick={() => deleteService(service.id)}>Delete</button>
                        <button onClick={() => confirmService(service.id)}>Confirm</button>
                    </div>
                ))}
            </main>
        </div>
    );
};

export default ServicesPage;
