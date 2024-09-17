/*Official website routes: Home, About, Contact, RegistrationForm, AdminLogin, AdminDashboard, ReportPage, and NewPage.
  Business owner routes: BusinessOwnerDashboardPage, SupportPage, FAQPage, ServicesPage, and BusinessOwnerLoginPage.
  Client routes: ShopViewPage and Option (with dynamic paths for different business owners).*/

import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Home from './official_website/components/Home';
import About from './official_website/components/About';
import Contact from './official_website/components/Contact';
import RegistrationForm from './official_website/components/RegistrationForm';
import AdminLogin from './official_website/components/AdminLogin';
import AdminDashboard from './official_website/components/AdminDashboard';
import BusinessOwnerDashboardPage from './business_owner/pages/BusinessOwnerDashboardPage';
import SupportPage from './business_owner/pages/SupportPage';
import FAQPage from './business_owner/pages/FAQPage';
import ServicesPage from './business_owner/pages/ServicesPage';
import BusinessOwnerLoginPage from './business_owner/pages/BusinessOwnerLoginPage';
import ShopViewPage from './client/pages/ShopViewPage';
import Option from './business_owner/components/Option';
import ReportPage from './official_website/pages/ReportPage';
import NewPage from './official_website/pages/NewPage';


const App = () => {
    return (
        <Router>
            <div>
                <Switch>
                    <Route path="/" exact component={Home} />
                    <Route path="/about" component={About} />
                    <Route path="/contact" component={Contact} />
                    <Route path="/register" component={RegistrationForm} />
                    <Route path="/admin/login" component={AdminLogin} />
                    <Route path="/admin/dashboard" component={AdminDashboard} />
                    <Route path="/admin/reports" component={ReportPage} />
                    <Route path="/business-owner/login" component={BusinessOwnerLoginPage} />
                    <Route path="/business-owner/dashboard" component={BusinessOwnerDashboardPage} />
                    <Route path="/business-owner/support" component={SupportPage} />
                    <Route path="/business-owner/faq" component={FAQPage} />
                    <Route path="/business-owner/services" component={ServicesPage} />
                    <Route path="/shop/:username" exact component={Option} />
                    <Route path="/shop/:username/view" render={({ match }) => {
                        const optionSelected = sessionStorage.getItem('option_selected');
                        if (!optionSelected) {
                            return <Redirect to={`/shop/${match.params.username}`} />;
                        }
                        return <ShopViewPage />;
                    }} />
                    <Route path="/admin/new" component={NewPage} />

                </Switch>
            </div>
        </Router>
    );
};

export default App;
