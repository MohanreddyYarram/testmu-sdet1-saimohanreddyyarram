import {test,expect} from '@playwright/test'

test.describe('Login',()=>{
    test.beforeEach(async({page})=>{
        await page.goto('https://www.saucedemo.com/');

    });

    test("Valid login succeeds and lands on inventory page",async({page})=>{
        await page.getByPlaceholder('Username').fill('standard_user');
        await page.getByPlaceholder('Password').fill('secret_sauce');
        await page.getByRole('button',{name:'Login'}).click();
        await expect(page).toHaveURL(/inventory\.html/);
        await expect(page.locator('.inventory_list')).toBeVisible();
    });

    test("Invalid Credentials show error message",async({page})=>{
        await page.getByPlaceholder('Username').fill('standard_user');
        await page.getByPlaceholder('Password').fill('wrong_password');
        await page.getByRole('button',{name:'Login'}).click();
        await expect(page.locator('[data-test="error"]')).toContainText('Username and password do not match');

    });

    test("Locked out user is blocked fromlogging in", async({page})=>{
        await page.getByPlaceholder('Username').fill('locked_out_user');
        await page.getByPlaceholder('Password').fill('secret_sauce');
        await page.getByRole('button',{name:"Login"}).click();
        await expect(page.locator('[data-test="error"]')).toContainText('has been locked out');

    });

    test('unauthenticated direct navigation to inventory is rejected',async({page})=>{
        await page.goto('https://www.saucedemo.com/inventory.html');
        await expect(page.locator('[data-test="error"]')).toContainText('you logged in');
    });

    test.fixme('forgot password flow resets credentials',async()=>{
        //Not implemented: saucedemo.com has no 'forgot password' flow.
    });



});