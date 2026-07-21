"""
Client Candidate Configuration & Target Role Mappings
Contains candidate profiles, C2C keyword exclusion lists, target roles, and resume asset lists.
"""

# Global Exclusion Keywords (Bench marketers, non-US, C2C spam)
EXCLUSION_KEYWORDS = [
    "c2c", "corp2corp", "corp-2-corp", "hotlist", "bench", "on my bench",
    "candidate available", "marketing my consultant", "available consultants",
    "pune", "noida", "bangalore", "hyderabad", "chennai", "mumbai", "delhi",
    "gurgaon", "canada", "toronto", "vancouver", "uk", "london"
]

# 60+ Technology Keywords for Dynamic Hook Sentence Generation
JD_KEYWORDS = [
    "Java", "Spring Boot", "Spring", "Microservices", "Python", "Django", "FastAPI",
    "React", "React.js", "Angular", "Vue.js", "TypeScript", "JavaScript", "Node.js",
    "Express.js", ".NET", "C#", "ASP.NET", "AWS", "Amazon Web Services", "Azure",
    "GCP", "Google Cloud", "Docker", "Kubernetes", "K8s", "SQL", "PostgreSQL",
    "MySQL", "MongoDB", "Redis", "Kafka", "Elasticsearch", "REST API", "GraphQL",
    "CI/CD", "Jenkins", "GitHub Actions", "Terraform", "Linux", "Git", "Maven",
    "Gradle", "Hibernate", "JPA", "JUnit", "Mockito", "Selenium", "PyTest",
    "Spark", "Hadoop", "Pandas", "NumPy", "TensorFlow", "PyTorch", "Snowflake",
    "Databricks", "Tableau", "Power BI", "Data Engineering", "Machine Learning"
]

# Registered Client Candidates
CLIENTS = {
    "default_candidate": {
        "name": "Mohammed Abdul Safi",
        "email": "candidate@example.com",
        "phone": "(555) 019-2834",
        "linkedin": "https://www.linkedin.com/in/candidate",
        "location": "Dallas, TX",
        "relocation": "Yes",
        "work_auth": "STEM OPT / H1B",
        "availability": "Immediate",
        "experience": "5+ Years",
        "salary": "Discuss with Employer",
        "primary_role": "Full Stack Developer",
        "search_roles": ["Java Developer", ".NET Developer", "Full Stack Developer", "Software Engineer"],
        "resume_path": "uploads/resume.pdf"
    }
}

# Candidate Target Roles & Exclusion Mappings
CANDIDATE_ROLES = {
    "full_stack": {
        "primary_role": "Full Stack Developer",
        "search_roles": ["Java Developer", ".NET Developer", "Full Stack Engineer", "Software Engineer"],
        "exclusion_keywords": ["hotlist", "c2c", "available consultants", "bench", "devops", "qa", "salesforce"]
    },
    "data_scientist": {
        "primary_role": "Data Scientist",
        "search_roles": ["Data Scientist", "Machine Learning Engineer", "AI Engineer"],
        "exclusion_keywords": ["hotlist", "c2c", "bench", "web developer", "qa"]
    }
}
