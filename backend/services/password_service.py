"""
Password generation service for Student Induction Management System.
Currently returns default test password 'Pass26'.
"""

TEST_DEFAULT_PASSWORD = "Pass26"


def generate_random_password(length: int = 6) -> str:
    """
    Generates password for student accounts.
    Returns 'Pass26' for testing.
    """
    return TEST_DEFAULT_PASSWORD
