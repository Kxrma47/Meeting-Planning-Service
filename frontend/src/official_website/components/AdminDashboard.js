import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { io } from "socket.io-client";
import "./AdminDashboard.css";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const socket = io("http://localhost:3001", {
  transports: ["websocket", "polling"],
});

const AdminDashboard = () => {
  const [registrations, setRegistrations] = useState([]);
  const [message, setMessage] = useState("");
  const [overallStatistics, setOverallStatistics] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    deleted: 0,
    total: 0,
  });
  const [tabStatistics, setTabStatistics] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    deleted: 0,
  });
  const [comments, setComments] = useState("");
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedAction, setSelectedAction] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [selectedTab, setSelectedTab] = useState("Pending");
  const [sortBy, setSortBy] = useState("newest");
  const [timeFilter, setTimeFilter] = useState("all");
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [isEmailConfirmationModalOpen, setIsEmailConfirmationModalOpen] =
    useState(false);
  const [editableEmailContent, setEditableEmailContent] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleNewPageClick = () => {
    history.push("/admin/new");
  };

  const history = useHistory();
  // WebSocket connection
  useEffect(() => {
    const socket = io("http://localhost:3001", {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("Connected to the WebSocket server");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from the WebSocket server");
    });

    socket.on("new_registration", (data) => {
      console.log("New registration event received:", data);
      setRegistrations((prevRegistrations) => [data, ...prevRegistrations]);
      fetchOverallStatistics();
    });

    socket.on("registration_approved", (data) => {
      console.log("Registration approved:", data);
      updateRegistrationStatus(data.user_id, "Approved");
    });

    socket.on("registration_rejected", (data) => {
      console.log("Registration rejected:", data);
      updateRegistrationStatus(data.user_id, "Rejected");
    });

    socket.on("registration_deleted", (data) => {
      console.log("Registration deleted:", data);
      removeRegistration(data.user_id);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/admin/check_session");
        if (!response.ok) {
          history.push("/admin/login");
        }
      } catch (error) {
        console.error("Error checking session:", error);
        history.push("/admin/login");
      }
    };

    checkSession();
    fetchOverallStatistics();
    fetchAllTabData();
    fetchData(selectedTab, sortBy, timeFilter);

    socket.on("new_registration", (data) => {
      setNotificationMessage(
        `New registration from ${data.companyName} (${data.email})`
      );
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
      fetchData(selectedTab, sortBy, timeFilter);
    });

    socket.on("registration_approved", (data) => {
      console.log("Registration approved:", data);
      fetchData(selectedTab, sortBy, timeFilter);
    });

    socket.on("registration_rejected", (data) => {
      console.log("Registration rejected:", data);
      fetchData(selectedTab, sortBy, timeFilter);
    });

    socket.on("registration_deleted", (data) => {
      console.log("Registration deleted:", data);
      fetchData(selectedTab, sortBy, timeFilter);
    });

    return () => {
      socket.off("new_registration");
      socket.off("registration_approved");
      socket.off("registration_rejected");
      socket.off("registration_deleted");
    };
  }, [selectedTab, sortBy, timeFilter, history, socket]);

  const fetchOverallStatistics = async () => {
    try {
      const response = await fetch("/api/admin/statistics");
      if (response.ok) {
        const data = await response.json();
        setOverallStatistics(data);
      } else {
        setMessage("Failed to load overall statistics");
      }
    } catch (error) {
      console.error("Error fetching overall statistics:", error);
      setMessage("An error occurred while fetching overall statistics");
    }
  };

  const fetchAllTabData = async () => {
    try {
      const tabs = ["Pending", "Approved", "Rejected", "Deleted"];
      const stats = { pending: 0, approved: 0, rejected: 0, deleted: 0 };

      for (const tab of tabs) {
        const response = await fetch(
          `/api/admin/dashboard?status=${tab}&sort_by=${sortBy}&time_filter=${timeFilter}`
        );
        if (response.ok) {
          const data = await response.json();
          stats[tab.toLowerCase()] = data.length;
        }
      }

      setTabStatistics(stats);
    } catch (error) {
      console.error("Error fetching tab data:", error);
      setMessage("An error occurred while fetching tab data");
    }
  };

  const fetchData = async (status, sort_by, time_filter) => {
    try {
      const response = await fetch(
        `/api/admin/dashboard?status=${status}&sort_by=${sort_by}&time_filter=${time_filter}`
      );
      if (response.ok) {
        const data = await response.json();
        setRegistrations(data);
        updateTabStatistics(data);
      } else {
        setMessage("Failed to load registrations");
      }
    } catch (error) {
      console.error("Error fetching registrations:", error);
      setMessage("An error occurred while fetching registrations");
    }
  };

  const updateTabStatistics = (data) => {
    const pending = data.filter((reg) => reg.status === "Pending").length;
    const approved = data.filter((reg) => reg.status === "Approved").length;
    const rejected = data.filter((reg) => reg.status === "Rejected").length;
    const deleted = data.filter((reg) => reg.status === "Deleted").length;

    setTabStatistics({ pending, approved, rejected, deleted });
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setTimeout(async () => {
        const response = await fetch("/api/admin/logout", {
          method: "POST",
        });

        if (response.ok) {
          history.push("/admin/login");
        } else {
          setMessage("Logout failed");
        }
      }, 500);
    } catch (error) {
      console.error("Error during logout:", error);
      setMessage("An error occurred. Please try again.");
    }
  };

  const handleAction = async () => {
    try {
      const finalEmailContent = editableEmailContent
        .replace("COMPANY_NAME", "Placeholder Company")
        .replace("USERNAME", "placeholder_username")
        .replace("PASSWORD", "placeholder_password")
        .replace("QR_CODE_LINK", "http://placeholder_link")
        .replace("COMMENTS", comments);

      const bodyData = {
        comments: comments,
        emailContent: finalEmailContent,
      };

      console.log("Sending data:", bodyData);

      const response = await fetch(
        `/api/admin/${selectedAction}/${selectedUserId}`,
        {
          method: selectedAction === "delete" ? "DELETE" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyData),
        }
      );

      if (response.ok) {
        const updatedRegistrations = registrations.map((reg) =>
          reg.id === selectedUserId
            ? {
                ...reg,
                status:
                  selectedAction === "delete"
                    ? "Deleted"
                    : selectedAction.charAt(0).toUpperCase() +
                      selectedAction.slice(1),
                comments,
              }
            : reg
        );
        setRegistrations(updatedRegistrations);
        fetchAllTabData();
        setMessage(`Registration ${selectedAction}ed successfully`);
        setShowCommentsModal(false);
        setComments("");

        if (selectedAction === "approve") {
          const data = await response.json();
          setEditableEmailContent(
            `<html>
                                                          <body>
                                                          <p>Congratulations, your business registration has been approved!</p>
                                                          <p>Here are your details:</p>
                                                          <p>Company: ${data.companyName}<br>
                                                          Username: ${data.username}<br>
                                                          Password: ${data.password}<br>
                                                          Shop QR Code Link: <a href="${data.qr_code_link}">${data.qr_code_link}</a></p>
                                                          </body>
                                                      </html>`
          );
          setIsEmailConfirmationModalOpen(true);
        } else if (selectedAction === "reject") {
          setEditableEmailContent(
            `<html>
                                                          <body>
                                                          <p>We regret to inform you that your business registration has been rejected.</p>
                                                          <p>Reason: ${comments}</p>
                                                          </body>
                                                      </html>`
          );
          setIsEmailConfirmationModalOpen(true);
        } else if (selectedAction === "delete") {
          setEditableEmailContent(
            `<html>
                                                          <body>
                                                          <p>We regret to inform you that your business registration has been deleted.</p>
                                                          <p>Reason: ${comments}</p>
                                                          </body>
                                                      </html>`
          );
          setIsEmailConfirmationModalOpen(true);
        }
      } else {
        setMessage(`Failed to ${selectedAction} registration`);
      }
    } catch (error) {
      console.error(`Error during ${selectedAction}:`, error);
      setMessage(`An error occurred. Please try again.`);
    }
  };

  const handleActionClick = (userId, action) => {
    setSelectedUserId(userId);
    setSelectedAction(action);
    setComments("");

    if (action === "approve") {
      setEditableEmailContent(
        `<html>
                                                  <body>
                                                  <p>Congratulations, your business registration has been approved!</p>
                                                  <p>Here are your details:</p>
                                                  <p>Company: COMPANY_NAME<br>
                                                  Username: USERNAME<br>
                                                  Password: PASSWORD<br>
                                                  Shop QR Code Link: <a href="QR_CODE_LINK">QR_CODE_LINK</a></p>
                                                  </body>
                                              </html>`
      );
    } else if (action === "reject") {
      setEditableEmailContent(
        `<html>
                                                  <body>
                                                  <p>We regret to inform you that your business registration has been rejected.</p>
                                                  <p>Reason: COMMENTS</p>
                                                  </body>
                                              </html>`
      );
    } else if (action === "delete") {
      setEditableEmailContent(
        `<html>
                                                  <body>
                                                  <p>We regret to inform you that your business registration has been deleted.</p>
                                                  <p>Reason: COMMENTS</p>
                                                  </body>
                                              </html>`
      );
    }

    setShowCommentsModal(true);
  };

  const handleEmailConfirm = async () => {
    try {
      const response = await fetch(
        `/api/admin/${selectedAction}/${selectedUserId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            comments,
            emailContent: editableEmailContent,
          }),
        }
      );

      if (response.ok) {
        setIsEmailConfirmationModalOpen(false);
        setMessage("Email sent successfully.");
        fetchAllTabData();
        fetchData(selectedTab, sortBy, timeFilter);
      } else {
        setMessage("Failed to send email.");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      setMessage("An error occurred. Please try again.");
    }
  };

  const handleTabClick = (tab) => {
    setSelectedTab(tab);
    fetchData(tab, sortBy, timeFilter);
  };

  const data = {
    labels: ["Pending", "Approved", "Rejected", "Deleted"],
    datasets: [
      {
        label: "Overall Registrations",
        data: [
          overallStatistics.pending,
          overallStatistics.approved,
          overallStatistics.rejected,
          overallStatistics.deleted,
        ],
        backgroundColor: ["#FFCE56", "#36A2EB", "#FF6384", "#FF4500"],
        borderColor: "#FFF",
        borderWidth: 2,
        hoverBackgroundColor: ["#FFCE56", "#36A2EB", "#FF6384", "#FF4500"],
        pointBackgroundColor: "#FFF",
        pointBorderColor: "#FFF",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: "#FFF",
        },
      },
      tooltip: {
        titleColor: "#FFF",
        bodyColor: "#FFF",
        backgroundColor: "rgba(0,0,0,0.7)",
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#FFF",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
      y: {
        ticks: {
          color: "#FFF",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
    },
  };
  const handleReportClick = () => {
    history.push("/admin/reports");
  };
  return (
    <div
      className={`admin-dashboard-container ${
        isLoggingOut ? "logout-animation" : ""
      }`}
    >
      <h2>Dashboard</h2>
      <div className="button-group">
        <button onClick={handleReportClick} className="reports-button">
          Reports
        </button>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
        <button onClick={handleNewPageClick} className="new-button">
          Contacts
        </button>
      </div>

      {message && <p className="message">{message}</p>}
      {showNotification && (
        <div className="notification">
          <p>{notificationMessage}</p>
        </div>
      )}
      <div className="graph-container">
        <Line data={data} options={options} />
      </div>
      <div className="tabs-container">
        <button
          className={`tab-button ${selectedTab === "Pending" ? "active" : ""}`}
          onClick={() => handleTabClick("Pending")}
        >
          Pending ({tabStatistics.pending})
        </button>
        <button
          className={`tab-button ${selectedTab === "Approved" ? "active" : ""}`}
          onClick={() => handleTabClick("Approved")}
        >
          Approved ({tabStatistics.approved})
        </button>
        <button
          className={`tab-button ${selectedTab === "Rejected" ? "active" : ""}`}
          onClick={() => handleTabClick("Rejected")}
        >
          Rejected ({tabStatistics.rejected})
        </button>
        <button
          className={`tab-button ${selectedTab === "Deleted" ? "active" : ""}`}
          onClick={() => handleTabClick("Deleted")}
        >
          Deleted ({tabStatistics.deleted})
        </button>
      </div>
      <div className="filters-container">
        <label htmlFor="sort">Sort by:</label>
        <select
          id="sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
        <label htmlFor="time">Time range:</label>
        <select
          id="time"
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="day">Last Day</option>
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="year">Last Year</option>
        </select>
      </div>
      <table className="registrations-table">
        <thead>
          <tr>
            <th>Personal Name</th>
            <th>Company Name</th>
            <th>Store Address</th>
            <th>Phone Number</th>
            <th>Email</th>
            <th>Services</th>
            <th>Working Hours</th>
            <th>Status</th>
            <th>Comments</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {registrations.map((reg, index) => {
            console.log(index, reg.companyName, reg.workingHours);
            return (
              <tr key={index}>
                <td>{reg.personalName}</td>
                <td>{reg.companyName}</td>
                <td>{reg.storeAddress}</td>
                <td>{reg.phoneNumber}</td>
                <td>{reg.email}</td>
                <td>
                  <ul>
                    {reg.services.map((service, idx) => (
                      <li key={idx}>
                        {service.title} - ${service.cost}: {service.description}
                      </li>
                    ))}
                  </ul>
                </td>
                <td>
                  <ul>
                    {reg.workingHours.map((day, idx) => (
                      <li key={idx}>
                        {day.day}: {day.start} - {day.end}
                      </li>
                    ))}
                  </ul>
                </td>
                <td>
                  <span className={`status ${reg.status.toLowerCase()}`}>
                    {reg.status}
                  </span>
                </td>
                <td>{reg.comments || "N/A"}</td>
                <td>
                  {reg.status === "Pending" ? (
                    <>
                      <button
                        onClick={() => handleActionClick(reg.id, "approve")}
                        className="approve-button"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleActionClick(reg.id, "reject")}
                        className="reject-button"
                      >
                        Reject
                      </button>
                    </>
                  ) : reg.status === "Approved" ? (
                    <>
                      <span
                        className={`status-chosen ${reg.status.toLowerCase()}`}
                      >
                        {reg.status}
                      </span>
                      <button
                        onClick={() => handleActionClick(reg.id, "delete")}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <span
                      className={`status-chosen ${reg.status.toLowerCase()}`}
                    >
                      {reg.status}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {showCommentsModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>
              {selectedAction.charAt(0).toUpperCase() + selectedAction.slice(1)}{" "}
              Registration
            </h3>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Enter comments"
            />
            <button
              onClick={handleAction}
              className="submit-action-button"
              disabled={!comments.trim()}
            >
              Submit
            </button>
            <button
              onClick={() => setShowCommentsModal(false)}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {isEmailConfirmationModalOpen && (
        <div className="email-content-modal">
          <div className="email-content">
            <h3>Confirmation Email Content</h3>
            <textarea
              value={editableEmailContent}
              onChange={(e) => setEditableEmailContent(e.target.value)}
              rows={10}
              cols={50}
            />
            <button onClick={handleEmailConfirm} className="send-button">
              Send
            </button>
            <button
              onClick={() => setIsEmailConfirmationModalOpen(false)}
              className="close-button"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
