import java.util.Scanner;

class Program {
    public static void main(String[] args) {

        Scanner sc = new Scanner(System.in);

        System.out.print("Enter a number: ");
        int n = sc.nextInt();

        // Prime check
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

        // Palindrome check
        int original = n;
        int reverse = 0;

        while (n > 0) {
            int digit = n % 10;
            reverse = reverse * 10 + digit;
            n = n / 10;
        }

        if (prime)
            System.out.println("Number is Prime");
        else
            System.out.println("Number is Not Prime");

        if (original == reverse)
            System.out.println("Number is Palindrome");
        else
            System.out.println("Number is Not Palindrome");
    }
}