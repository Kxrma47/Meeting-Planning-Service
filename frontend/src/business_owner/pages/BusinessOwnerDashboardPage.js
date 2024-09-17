import React from 'react';
import { Route, Switch } from 'react-router-dom';
import BusinessOwnerDashboard from '../components/BusinessOwnerDashboard';
import ServicesPage from './ServicesPage';
import FAQPage from './FAQPage';
import SupportPage from './SupportPage';

const BusinessOwnerDashboardPage = () => {
    return (
        <Switch>
            <Route path="/business-owner/dashboard" component={BusinessOwnerDashboard} />
            <Route path="/business-owner/services" component={ServicesPage} />
            <Route path="/business-owner/faq" component={FAQPage} />
            <Route path="/business-owner/support" component={SupportPage} />
        </Switch>
    );
};

export default BusinessOwnerDashboardPage;
