import React, { useEffect, useState } from "react";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  DoughnutController,
  ArcElement,
} from "chart.js";
import { Link, useHistory } from "react-router-dom";
import styles from "./BusinessOwnerDashboard.module.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  DoughnutController,
  ArcElement
);

const BusinessOwnerDashboard = () => {
  const [statistics, setStatistics] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [completedReservations, setCompletedReservations] = useState([]);
  const [servicesData, setServicesData] = useState([]);
  const [shopName, setShopName] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [selectedTab, setSelectedTab] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [timeFilter, setTimeFilter] = useState("all");
  const [showPopup, setShowPopup] = useState(false);
  const [popupContent, setPopupContent] = useState("");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [reservationToAccept, setReservationToAccept] = useState(null);
  const [reportedReservations, setReportedReservations] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [cancelledReservations, setCancelledReservations] = useState([]);
  const getTotalEarnings = () => {
    return servicesData.reduce((total, service) => total + service.earnings, 0);
  };

  const history = useHistory();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/business_owner/dashboard_data");
        if (response.ok) {
          const result = await response.json();
          console.log("Fetched Data:", result);
          setStatistics(result.statistics);
          setEarnings(result.earnings);
          setReservations(result.reservations);
          setCompletedReservations(result.completed_reservations);
          setCancelledReservations(result.cancelled_reservations);
          setServicesData(result.servicesData || []);
          setFilteredReservations(result.reservations);
          setShopName(result.shop_name);
          setUsername(result.username);
          setChangeRequests(result.changeRequests || []);
        } else if (response.status === 401) {
          history.push("/business-owner/login");
        } else {
          setError("Failed to fetch data.");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("An error occurred while fetching data.");
      }
    };

    fetchData();
  }, [history]);

  console.log("Filtered Reservations:", filteredReservations);

  const triggerPopup = (content) => {
    setPopupContent(content);
    setShowPopup(true);
    setTimeout(() => {
      setShowPopup(false);
    }, 5000);
  };

  useEffect(() => {
    applyFilters();
  }, [
    selectedTab,
    sortBy,
    timeFilter,
    reservations,
    completedReservations,
    changeRequests,
  ]);

  const applyFilters = () => {
    let filtered;

    if (selectedTab === "Completed") {
      filtered = [...completedReservations];
    } else if (selectedTab === "Reported") {
      filtered = reservations.filter(
        (reservation) => reservation.status === "Reported"
      );
    } else if (selectedTab === "NameChangeRequests") {
      filtered = [...changeRequests];
    } else if (selectedTab === "Rejected") {
      filtered = reservations.filter(
        (reservation) => reservation.status === "Rejected"
      );
    } else if (selectedTab === "Cancelled") {
      console.log("Applying Cancelled Filter");
      filtered = [...cancelledReservations];
      console.log("Filtered Cancelled Reservations:", filtered);

      setFilteredReservations(filtered);
      return;
    } else if (selectedTab === "All") {
      filtered = reservations.filter(
        (reservation) =>
          reservation.status !== "Reported" &&
          reservation.status !== "Cancelled"
      );
    } else {
      filtered = [...reservations];
    }

    if (
      selectedTab !== "All" &&
      selectedTab !== "Completed" &&
      selectedTab !== "Reported" &&
      selectedTab !== "NameChangeRequests"
    ) {
      filtered = filtered.filter(
        (reservation) => reservation.status === selectedTab
      );
    }

    if (sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else {
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    const now = new Date();
    if (timeFilter !== "all") {
      filtered = filtered.filter((reservation) => {
        const reservationDate = new Date(reservation.date);
        switch (timeFilter) {
          case "today":
            return reservationDate.toDateString() === now.toDateString();
          case "yesterday":
            return (
              reservationDate.toDateString() ===
              new Date(now.setDate(now.getDate() - 1)).toDateString()
            );
          case "week":
            return reservationDate >= new Date(now.setDate(now.getDate() - 7));
          case "month":
            return (
              reservationDate >= new Date(now.setMonth(now.getMonth() - 1))
            );
          case "year":
            return (
              reservationDate >=
              new Date(now.setFullYear(now.getFullYear() - 1))
            );
          default:
            return true;
        }
      });
    }

    const uniqueReservations = filtered.filter(
      (reservation, index, self) =>
        index ===
        self.findIndex(
          (r) =>
            r.id === reservation.id &&
            r.appointment_id === reservation.appointment_id
        )
    );

    console.log("Filtered Reservations:", uniqueReservations);

    if (
      JSON.stringify(uniqueReservations) !==
      JSON.stringify(filteredReservations)
    ) {
      setFilteredReservations(uniqueReservations);
    }
  };

  const handleAcceptAction = (reservationId) => {
    setReservationToAccept(reservationId);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmOTP = async () => {
    try {
      const action = "accept";
      const response = await fetch(
        `/api/business_owner/${action}/${reservationToAccept}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        const popupMessage = `OTP: ${result.otp}\n\nConfirmation Message:\n${result.confirmation_message}`;
        triggerPopup(popupMessage);

        if (!result.email_success || !result.sms_success) {
          alert(
            "Failed to send confirmation message via email or SMS. Please check the server logs."
          );
        }

        setMessage("Reservation accepted successfully");
        setReservations((prevReservations) =>
          prevReservations.map((reservation) =>
            reservation.id === reservationToAccept
              ? { ...reservation, status: "Accepted" }
              : reservation
          )
        );
      } else {
        setMessage("Failed to accept reservation");
      }
    } catch (error) {
      console.error("Error during accept:", error);
      setMessage("An error occurred. Please try again.");
    } finally {
      setIsConfirmModalOpen(false);
      setReservationToAccept(null);
    }
  };

  const handleArrived = async (reservationId) => {
    const otpInput = prompt("Please enter the OTP provided by the client:");
    if (!otpInput) {
      alert("OTP is required.");
      return;
    }

    try {
      const response = await fetch(
        `/api/business_owner/arrived/${reservationId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ otp: otpInput }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setReservations((prevReservations) =>
          prevReservations.map((reservation) =>
            reservation.id === reservationId
              ? { ...reservation, status: "Arrived" }
              : reservation
          )
        );
        setMessage('Client has arrived. They are now marked as "Arrived".');
      } else {
        setMessage("Failed to verify OTP and mark arrival.");
      }
    } catch (error) {
      console.error("Error during arrival processing:", error);
      setMessage("An error occurred. Please try again.");
    }
  };

  const handlePaid = async (reservationId) => {
    try {
      const response = await fetch(
        `/api/business_owner/paid/${reservationId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();

        setEarnings(result.earnings);
        setReservations((prevReservations) =>
          prevReservations.filter(
            (reservation) => reservation.id !== reservationId
          )
        );
        setCompletedReservations((prevReservations) => [
          ...prevReservations,
          { ...result.reservation, status: "Completed" },
        ]);

        setMessage(
          "Payment confirmed. Reservation moved to Completed tab and earnings updated."
        );
      } else {
        setMessage("Failed to confirm payment.");
      }
    } catch (error) {
      console.error("Error during payment confirmation:", error);
      setMessage("An error occurred. Please try again.");
    }
  };
  const handleAcceptChangeRequest = async (reservationId) => {
    try {
      const response = await fetch(
        `/api/business_owner/accept_change/${reservationId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setMessage(
          `Change request accepted successfully and appointment updated.`
        );

        setReservations((prevReservations) =>
          prevReservations.map((reservation) =>
            reservation.id === reservationId
              ? { ...reservation, status: "Accepted" }
              : reservation
          )
        );
      } else {
        setMessage("Failed to accept change request.");
      }
    } catch (error) {
      console.error("Error during accept:", error);
      setMessage("An error occurred. Please try again.");
    }
  };

  const handleAction = async (reservationId, action) => {
    if (selectedTab === "NameChangeRequests") {
      try {
        const response = await fetch(
          `/api/business_owner/accept_change/${reservationId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const result = await response.json();
          setMessage(
            `Change request accepted successfully and appointment updated.`
          );

          setReservations((prevReservations) =>
            prevReservations.map((reservation) =>
              reservation.id === reservationId
                ? { ...reservation, status: "Accepted" }
                : reservation
            )
          );
        } else {
          setMessage("Failed to accept change request.");
        }
      } catch (error) {
        console.error("Error during accept:", error);
        setMessage("An error occurred. Please try again.");
      }
    } else {
      if (action === "accept") {
        handleAcceptAction(reservationId);
      } else if (action === "arrived") {
        handleArrived(reservationId);
      } else if (action === "paid") {
        handlePaid(reservationId);
      } else if (action === "report") {
        const reportDetails = prompt("Please provide details for the report:");
        if (!reportDetails) {
          alert("Report details are required.");
          return;
        }

        try {
          const response = await fetch(
            `/api/business_owner/${action}/${reservationId}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ report_details: reportDetails }),
            }
          );

          if (response.ok) {
            setMessage(`Reservation reported successfully`);
            setReservations((prevReservations) =>
              prevReservations.filter(
                (reservation) => reservation.id !== reservationId
              )
            );
            setReportedReservations((prevReportedReservations) => [
              ...prevReportedReservations,
              {
                ...reservations.find(
                  (reservation) => reservation.id === reservationId
                ),
                status: "Reported",
              },
            ]);
          } else {
            setMessage(`Failed to report reservation`);
          }
        } catch (error) {
          console.error(`Error during reporting:`, error);
          setMessage(`An error occurred. Please try again.`);
        }
      } else {
        try {
          let postData = {};
          if (action === "reject") {
            const reason = prompt("Please provide a reason for rejection:");
            if (!reason) {
              alert("Rejection reason is required.");
              return;
            }
            postData = { reason };
          } else if (action === "report") {
            const reportDetails = prompt(
              "Please provide details for the report:"
            );
            if (!reportDetails) {
              alert("Report details are required.");
              return;
            }
            postData = { report_details: reportDetails };
          }

          const response = await fetch(
            `/api/business_owner/${action}/${reservationId}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(postData),
            }
          );

          if (response.ok) {
            setMessage(`Reservation ${action}ed successfully`);

            if (action === "report") {
              setReservations((prevReservations) =>
                prevReservations.filter(
                  (reservation) => reservation.id !== reservationId
                )
              );
              setReportedReservations((prevReportedReservations) => [
                ...prevReportedReservations,
                {
                  ...reservations.find(
                    (reservation) => reservation.id === reservationId
                  ),
                  status: "Reported",
                },
              ]);
            } else {
              setReservations((prevReservations) =>
                prevReservations.map((reservation) =>
                  reservation.id === reservationId
                    ? {
                        ...reservation,
                        status: action === "reject" ? "Rejected" : "Reported",
                      }
                    : reservation
                )
              );
            }
          } else {
            setMessage(`Failed to ${action} reservation`);
          }
        } catch (error) {
          console.error(`Error during ${action}:`, error);
          setMessage(`An error occurred. Please try again.`);
        }
      }
    }
  };

  const handleCancelOTP = () => {
    setIsConfirmModalOpen(false);
    setReservationToAccept(null);
  };

  const reservationChartData = statistics
    ? {
        labels: [
          "Pending",
          "Accepted",
          "Rejected",
          "Reported",
          "Completed",
          "Pending Payment",
          "Cancelled",
        ],
        datasets: [
          {
            label: "Reservations",
            data: [
              statistics.pending || 0,
              statistics.accepted || 0,
              statistics.rejected || 0,
              statistics.reported || 0,
              completedReservations.length || 0,
              statistics.pending_payment || 0,
              statistics.cancelled || 0,
            ],
            backgroundColor: [
              "rgba(255, 206, 86, 0.2)",
              "rgba(54, 162, 235, 0.2)",
              "rgba(255, 99, 132, 0.2)",
              "rgba(153, 102, 255, 0.2)",
              "rgba(75, 192, 192, 0.2)",
              "rgba(255, 159, 64, 0.2)",
              "rgba(128, 128, 128, 0.2)",
            ],
            borderColor: [
              "rgba(255, 206, 86, 1)",
              "rgba(54, 162, 235, 1)",
              "rgba(255, 99, 132, 1)",
              "rgba(153, 102, 255, 1)",
              "rgba(75, 192, 192, 1)",
              "rgba(128, 128, 128, 1)",
            ],
            borderWidth: 1,
          },
        ],
      }
    : {
        labels: [
          "Pending",
          "Accepted",
          "Rejected",
          "Reported",
          "Completed",
          "Pending Payment",
          "Cancelled",
        ],
        datasets: [
          {
            label: "Reservations",
            data: [0, 0, 0, 0, 0, 0, 0],
            backgroundColor: "rgba(200, 200, 200, 0.5)",
            borderColor: "rgba(150, 150, 150, 1)",
            borderWidth: 1,
          },
        ],
        annotation: {
          drawTime: "afterDatasetsDraw",
          annotations: [
            {
              type: "label",
              position: "center",
              content: "Not enough data",
              font: {
                size: 18,
              },
              enabled: true,
            },
          ],
        },
      };

  const earningsByServiceData = servicesData.length
    ? {
        labels: servicesData.map((service) => service.title),
        datasets: [
          {
            label: "Earnings by Service",
            data: servicesData.map((service) => service.earnings),
            backgroundColor: servicesData.map(
              () =>
                `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(
                  Math.random() * 255
                )}, ${Math.floor(Math.random() * 255)}, 0.2)`
            ),
            borderColor: servicesData.map(
              () =>
                `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(
                  Math.random() * 255
                )}, ${Math.floor(Math.random() * 255)}, 1)`
            ),
            borderWidth: 1,
          },
        ],
      }
    : {
        labels: ["Service 1", "Service 2", "Service 3"],
        datasets: [
          {
            label: "Earnings by Service",
            data: [0, 0, 0],
            backgroundColor: "rgba(200, 200, 200, 0.5)",
            borderColor: "rgba(150, 150, 150, 1)",
            borderWidth: 1,
          },
        ],
        annotation: {
          drawTime: "afterDatasetsDraw",
          annotations: [
            {
              type: "label",
              position: "center",
              content: "Not enough data",
              font: {
                size: 18,
              },
              enabled: true,
            },
          ],
        },
      };

  const comparativeChartData = earnings
    ? {
        labels: ["Daily", "Weekly", "Monthly"],
        datasets: [
          {
            label: "Comparative Earnings",
            data: [
              earnings.daily || 0,
              earnings.weekly || 0,
              earnings.monthly || 0,
            ],
            backgroundColor: "rgba(54, 162, 235, 0.2)",
            borderColor: "#36A2EB",
            borderWidth: 1,
          },
        ],
      }
    : {
        labels: ["Daily", "Weekly", "Monthly"],
        datasets: [
          {
            label: "Comparative Earnings",
            data: [0, 0, 0],
            backgroundColor: "rgba(200, 200, 200, 0.5)",
            borderColor: "rgba(150, 150, 150, 1)",
            borderWidth: 1,
          },
        ],
        annotation: {
          drawTime: "afterDatasetsDraw",
          annotations: [
            {
              type: "label",
              position: "center",
              content: "Not enough data",
              font: {
                size: 18,
              },
              enabled: true,
            },
          ],
        },
      };

  const forecastingChartData =
    earnings && earnings.forecast
      ? {
          labels: earnings.forecast.labels,
          datasets: [
            {
              label: "Earnings Forecast",
              data: earnings.forecast.data,
              fill: false,
              borderColor: "#FF6384",
              tension: 0.1,
            },
          ],
        }
      : {
          labels: ["Next Week", "Next Month", "Next Year"],
          datasets: [
            {
              label: "Earnings Forecast",
              data: [0, 0, 0],
              backgroundColor: "rgba(200, 200, 200, 0.5)",
              borderColor: "rgba(150, 150, 150, 1)",
              borderWidth: 1,
            },
          ],
          annotation: {
            drawTime: "afterDatasetsDraw",
            annotations: [
              {
                type: "label",
                position: "center",
                content: "Not enough data",
                font: {
                  size: 18,
                },
                enabled: true,
              },
            ],
          },
        };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setTimeout(async () => {
        const response = await fetch("/api/business_owner/logout", {
          method: "POST",
        });
        if (response.ok) {
          history.push("/business-owner/login");
        } else {
          alert("Logout failed. Please try again.");
          setIsLoggingOut(false);
        }
      }, 500);
    } catch (error) {
      console.error("Error during logout:", error);
      alert("An error occurred. Please try again.");
      setIsLoggingOut(false);
    }
  };

  return (
    <div
      className={`${styles["business-owner-dashboard"]} ${
        isLoggingOut ? styles["logout-animation"] : ""
      }`}
    >
      <header className={styles.header}>
        <nav className={styles.nav}>
          <ul>
            <li>
              <Link to="/business-owner/dashboard">Dashboard</Link>
            </li>
            <li>
              <Link to="/business-owner/services">Services</Link>
            </li>
            <li>
              <Link to="/business-owner/faq">FAQ</Link>
            </li>
            <li>
              <Link to="/business-owner/support">Support</Link>
            </li>
          </ul>
          <button onClick={handleLogout} className={styles["logout-button"]}>
            Logout
          </button>
        </nav>
        <h1>{shopName} Dashboard</h1>
        <h2>{username}</h2>
      </header>
      <main className={styles["main-content"]}>
        {message && <p className={styles.message}>{message}</p>}
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles["charts-wrapper"]}>
          <div className={styles["chart-section"]}>
            <div className={styles["chart-container"]}>
              <Bar data={reservationChartData} />
            </div>
          </div>
          <div className={styles["chart-section"]}>
            <div className={styles["chart-container"]}>
              <Bar data={comparativeChartData} />
            </div>
          </div>
          <div className={styles["chart-section"]}>
            <div className={styles["chart-container"]}>
              <Doughnut data={earningsByServiceData} />
            </div>
            <div className={styles["earnings-summary"]}>
              <h3>Total Earnings: ${getTotalEarnings().toFixed(2)}</h3>
              <ul>
                {servicesData.map((service, index) => (
                  <li key={index}>
                    {service.title}: ${service.earnings.toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className={styles["chart-section"]}>
            <div className={styles["chart-container"]}>
              <Line data={forecastingChartData} />
            </div>
          </div>
        </div>
        <div className={styles["filters-container"]}>
          <div className={styles["tab-buttons"]}>
            <button
              onClick={() => setSelectedTab("All")}
              className={selectedTab === "All" ? styles.active : ""}
            >
              All
            </button>
            <button
              onClick={() => setSelectedTab("Pending")}
              className={selectedTab === "Pending" ? styles.active : ""}
            >
              Pending
            </button>
            <button
              onClick={() => setSelectedTab("Accepted")}
              className={selectedTab === "Accepted" ? styles.active : ""}
            >
              Accepted
            </button>
            <button
              onClick={() => setSelectedTab("Rejected")}
              className={selectedTab === "Rejected" ? styles.active : ""}
            >
              Rejected
            </button>
            <button
              onClick={() => setSelectedTab("Arrived")}
              className={selectedTab === "Arrived" ? styles.active : ""}
            >
              Arrived
            </button>
            <button
              onClick={() => setSelectedTab("Completed")}
              className={selectedTab === "Completed" ? styles.active : ""}
            >
              Completed
            </button>
            <button
              onClick={() => setSelectedTab("Reported")}
              className={selectedTab === "Reported" ? styles.active : ""}
            >
              Reported
            </button>{" "}
            {/* New Tab */}
            <button
              onClick={() => setSelectedTab("NameChangeRequests")}
              className={
                selectedTab === "NameChangeRequests" ? styles.active : ""
              }
            >
              Change Requests
            </button>
            <button
              onClick={() => setSelectedTab("Cancelled")}
              className={selectedTab === "Cancelled" ? styles.active : ""}
            >
              Cancelled
            </button>
          </div>
          <div className={styles["filter-options"]}>
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
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
          </div>
        </div>
        <table className={styles["reservations-table"]}>
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Phone Number</th>
              <th>Email</th>
              <th>Service</th>
              <th>Date</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Status</th>
              {selectedTab === "Rejected" && <th>Rejection Reason</th>}{" "}
              {/* New Column for Rejection Reason */}
              {selectedTab === "Cancelled" && <th>Cancellation Reason</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReservations.map((reservation, index) => {
              const services =
                reservation.service || reservation.requested_service;
              const date = reservation.date || reservation.requested_date;
              const startTime =
                reservation.start_time || reservation.requested_date;
              const endTime =
                reservation.end_time || reservation.requested_end_time;

              return (
                <tr key={`${reservation.id}-${reservation.appointment_id}`}>
                  <td>{reservation.client_name || "N/A"}</td>
                  <td>{reservation.phone_number || "N/A"}</td>
                  <td>{reservation.client_email || "N/A"}</td>
                  <td>
                    {services &&
                    Array.isArray(services) &&
                    services.length > 0 ? (
                      services.map((service, serviceIndex) => (
                        <div key={serviceIndex}>
                          {service.name || "Unknown Service"} - Quantity:{" "}
                          {service.quantity}
                        </div>
                      ))
                    ) : (
                      <div>No service information available</div>
                    )}
                  </td>

                  <td>
                    {date
                      ? new Date(date).toLocaleDateString("en-GB", {
                          timeZone: "Europe/Moscow",
                        })
                      : "Date not available"}
                  </td>
                  <td>
                    {startTime
                      ? new Date(startTime).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                          timeZone: "Europe/Moscow",
                        })
                      : "Time not available"}
                  </td>
                  <td>
                    {endTime
                      ? new Date(endTime).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                          timeZone: "Europe/Moscow",
                        })
                      : "Time not available"}
                  </td>
                  <td>{reservation.status || "N/A"}</td>
                  {selectedTab === "Rejected" && (
                    <td>
                      {reservation.rejection_reason || "No reason provided"}
                    </td>
                  )}
                  {selectedTab === "Cancelled" && (
                    <td>
                      {reservation.cancellation_reason || "No reason provided"}
                    </td>
                  )}
                  <td>
                    {reservation.status === "Pending" && (
                      <>
                        <button
                          onClick={() => handleAction(reservation.id, "accept")}
                          className={styles["accept-button"]}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleAction(reservation.id, "reject")}
                          className={styles["reject-button"]}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {reservation.status === "Accepted" && (
                      <>
                        <button
                          onClick={() =>
                            handleAction(reservation.id, "arrived")
                          }
                          className={styles["arrived-button"]}
                        >
                          Arrived
                        </button>
                        {reservation.status === "Reported" ? (
                          <button
                            disabled
                            className={styles["reported-button"]}
                          >
                            Reported
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleAction(reservation.id, "report")
                            }
                            className={styles["report-button"]}
                          >
                            Report
                          </button>
                        )}
                      </>
                    )}
                    {reservation.status === "Arrived" && (
                      <>
                        <button
                          onClick={() => handleAction(reservation.id, "paid")}
                          className={styles["paid-button"]}
                        >
                          Paid
                        </button>
                        {reservation.status === "Reported" ? (
                          <button
                            disabled
                            className={styles["reported-button"]}
                          >
                            Reported
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleAction(reservation.id, "report")
                            }
                            className={styles["report-button"]}
                          >
                            Report
                          </button>
                        )}
                      </>
                    )}
                    {reservation.status === "Completed" && (
                      <button
                        onClick={() => handleAction(reservation.id, "report")}
                        className={styles["report-button"]}
                      >
                        Report
                      </button>
                    )}
                    {reservation.status === "Reported" && (
                      <button disabled className={styles["reported-button"]}>
                        Reported
                      </button>
                    )}
                    {reservation.status === "Rejected" && (
                      <>
                        <button
                          onClick={() => handleAction(reservation.id, "report")}
                          className={styles["report-button"]}
                        >
                          Report
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {isConfirmModalOpen && (
          <div className={styles.confirmModal}>
            <div className={styles.modalContent}>
              <h3>Confirm OTP and Message Sending</h3>
              <p>
                Are you sure you want to generate and send the OTP and
                confirmation message?
              </p>
              <div className={styles.modalButtons}>
                <button
                  onClick={handleConfirmOTP}
                  className={styles.confirmButton}
                >
                  Confirm
                </button>
                <button
                  onClick={handleCancelOTP}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {showPopup && <div className={styles.popup}>{popupContent}</div>}
      </main>
    </div>
  );
};

export default BusinessOwnerDashboard;
