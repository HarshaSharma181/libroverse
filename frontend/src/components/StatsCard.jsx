import React from 'react';

const StatsCard = ({ title, value, color }) => {
    return (
        <div className="col-md-3">
            <div className={`card text-white bg-${color} mb-3 shadow`}>
                <div className="card-body text-center">
                    <h5 className="card-title opacity-75">{title}</h5>
                    <p className="card-text display-6 fw-bold">{value}</p>
                </div>
            </div>
        </div>
    );
};
export default StatsCard;