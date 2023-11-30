#!/bin/python3
import requests
from bs4 import BeautifulSoup
import datetime
import sys
import os
import re

from export_tracks import export_tracks
from convert_tracks import convert_tracks

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Please specify the target date")
        exit(1)
    date = sys.argv[1]
    tracks = export_tracks(date)
    convert_tracks(date, tracks)