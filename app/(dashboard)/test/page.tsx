"use client"
import React, { useState } from 'react';
import Image from 'next/image';

interface ProfileCardProps {
    name?: string;
    title?: string;
    image?: string;
    description?: string;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
    name = 'John Doe',
    title = 'Software Engineer',
    image = 'https://images.unsplash.com/photo-1573497019236-17f8177b81e8?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    description = 'A passionate developer dedicated to building elegant and efficient web applications. Always eager to learn new technologies and contribute to innovative projects.',
}) => {
    const [isHovered, setIsHovered] = useState(false);

    const cardContainerStyle: React.CSSProperties = {
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '25px',
        textAlign: 'center',
        maxWidth: '320px',
        margin: '20px auto',
        backgroundColor: '#fff',
        fontFamily: 'Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        color: '#333',
        transition: 'all 0.3s ease-in-out', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        cursor: 'pointer',
    };

    const cardContainerHoverStyle: React.CSSProperties = {
        transform: 'scale(1.02) translateY(-5px)',
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
    };

    const profileImageStyle: React.CSSProperties = {
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        objectFit: 'cover',
        marginBottom: '20px',
        border: '4px solid #007bff',
        boxShadow: '0 2px 8px rgba(0, 123, 255, 0.3)',
        transition: 'transform 0.3s ease-in-out',
        flexShrink: 0,
    };

    const profileImageHoverStyle: React.CSSProperties = {
        transform: 'scale(1.05)',
    };

    return (
        <div
            style={{ ...cardContainerStyle, ...(isHovered ? cardContainerHoverStyle : {}) }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            role="region"
            aria-label={`${name}'s profile card`}
        >
            <Image
                src={image}
                alt={`Profile picture of ${name}`}
                width={120}
                height={120}
                style={{ ...profileImageStyle, ...(isHovered ? profileImageHoverStyle : {}) }}
            />
            <h2 style={textStyles.profileName}>{name}</h2>
            <h3 style={textStyles.profileTitle}>{title}</h3>
            <p style={textStyles.profileDescription}>{description}</p>
        </div>
    );
};

const textStyles: { [key: string]: React.CSSProperties } = {
    profileName: {
        fontSize: '2em',
        margin: '10px 0 5px 0',
        color: '#222',
        fontWeight: '600',
    },
    profileTitle: {
        fontSize: '1.2em',
        color: '#555',
        marginBottom: '20px',
        fontWeight: 'normal',
    },
    profileDescription: {
        fontSize: '0.95em',
        color: '#666',
        lineHeight: '1.6',
    },
};

export default ProfileCard;