import random
import string
import os

def generate_passwords(count=1000, length=6, filepath=r"F:\instituteproj\std\FY-Induction\pass\passwords.txt"):
    # Ensure directory exists
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    # Define characters: uppercase, lowercase, digits
    chars = string.ascii_letters + string.digits
    
    # Generate passwords
    passwords = ["".join(random.choices(chars, k=length)) for _ in range(count)]
    
    # Save to file
    with open(filepath, "w") as f:
        for p in passwords:
            f.write(p + "\n")
    
    print(f"{count} passwords saved to {filepath}")

# Run the function
generate_passwords()
