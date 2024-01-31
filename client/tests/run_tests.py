import unittest

from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class JSTest(unittest.TestCase):
  def setUp(self):
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})

    self.browser = webdriver.Chrome(options=options)

  def tearDown(self):
    self.browser.quit()
  
  def run_test(self, script):
    self.browser.get(f"http://localhost:6001/tests/#{script}")
    wait = WebDriverWait(self.browser, 20)
    result = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '.flag'))).get_attribute("result")

    if result != "success":
      for entry in self.browser.get_log("browser"):
        print(f"{entry['level']}: {entry['message']}")

    assert result == "success"
  
  def test_fetch_once(self):
    self.run_test("fetch_once.js")

  def test_fetch_multiple(self):
    self.run_test("fetch_multiple.js")

  def test_fetch_parallel(self):
    self.run_test("fetch_parallel.js")
  
  def test_websocket(self):
    self.run_test("test_websocket.js")

if __name__ == "__main__":
  unittest.main()