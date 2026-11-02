import java.util.Scanner;

class PrimePalindrome {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        System.out.print("Enter a number: ");
        int n = sc.nextInt();

        // Check Prime
        boolean prime = true;

        if (n <= 1) {
            prime = false;
        } else {
            for (int i = 2; i <= n / 2; i++) {
                if (n % i == 0) {
                    prime = false;
                    break;
                }
            }
        }

        // Check Palindrome
        int original = n;
        int reverse = 0;

        while (n > 0) {
            int digit = n % 10;
            reverse = reverse * 10 + digit;
            n = n / 10;
        }

        // Display results
        if (prime)
            System.out.println("The number is Prime.");
        else
            System.out.println("The number is not Prime.");

        if (original == reverse)
            System.out.println("The number is Palindrome.");
        else
            System.out.println("The number is not Palindrome.");
    }
}