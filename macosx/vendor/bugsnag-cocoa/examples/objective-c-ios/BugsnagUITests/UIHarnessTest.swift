//
//  UIHarnessTest.swift
//  UIHarnessTest
//
//  Created by Jamie Lynch on 28/07/2017.
//  Copyright © 2017 Simon Maynard. All rights reserved.
//

import XCTest

class UIHarnessTest: XCTestCase {
    
    override func setUp() {
        super.setUp()
        // In UI tests it is usually best to stop immediately when a failure occurs.
        continueAfterFailure = false
        XCUIApplication().launch()
    }
    
    override func tearDown() {
        super.tearDown()
    }
    
    func testExample() {
        // launches app and sends reports
    }
    
}
