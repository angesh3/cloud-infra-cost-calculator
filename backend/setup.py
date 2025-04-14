from setuptools import setup, find_packages

setup(
    name="cloud-infra-cost-calculator",
    version="0.1",
    packages=find_packages(),
    install_requires=[
        "fastapi==0.68.1",
        "uvicorn==0.15.0",
        "pydantic==1.8.2",
    ],
) 